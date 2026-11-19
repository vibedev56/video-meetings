const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Работаем из корня репозитория независимо от каталога запуска.
process.chdir(path.resolve(__dirname, '..'));

const config = JSON.parse(fs.readFileSync('.claude/ralph.config.json', 'utf8'));
const counterFile = '.claude/ralph.iterations.json';

// Индекс фазы можно передать аргументом: node .claude/ralph-start.js 1
const startIndex = Number.parseInt(process.argv[2] ?? '0', 10);

if (!config.phases?.[startIndex]) {
  console.error(
    `Фаза с индексом ${process.argv[2] ?? 0} не найдена в ralph.config.json`,
  );
  process.exit(1);
}

const saveCounter = (count, phaseIndex) =>
  fs.writeFileSync(counterFile, JSON.stringify({ count, phaseIndex }));

// Каждая сессия claude получает RALPH_CHILD=1, поэтому Stop-хук
// (.claude/hooks/stop.js) в ней ничего не делает, даже если active=true.
// Сессии идут строго одна за другой, без вложенности.
const runClaude = (args) => {
  const result = spawnSync('claude', ['-p', ...args], {
    stdio: 'inherit',
    env: { ...process.env, RALPH_CHILD: '1' },
  });
  return result.status === 0;
};

const buildPrompt = (phase) =>
  config.prompt
    .replaceAll('{milestone}', phase.milestone)
    .replaceAll('{branch}', phase.branch);

const openIssues = (phase) =>
  JSON.parse(
    execSync(
      `gh issue list --milestone "${phase.milestone}" --state open --json number,title`,
    ).toString(),
  ).sort((a, b) => a.number - b.number);

for (let i = startIndex; i < config.phases.length; i++) {
  const phase = config.phases[i];
  console.log(`🚀 Фаза ${i + 1}: ${phase.milestone} (ветка ${phase.branch})`);

  let count = 0;
  let lastIssue = null;
  let stalls = 0;

  while (true) {
    const issues = openIssues(phase);
    if (issues.length === 0) break;

    if (count >= config.maxIterations) {
      console.log(`⛔ Лимит итераций (${config.maxIterations}) достигнут.`);
      saveCounter(0, i);
      process.exit(0);
    }

    const next = issues[0];
    // Одна и та же Issue осталась открытой после итерации: агент не справился
    // (например, упёрся в разрешения). Двух попыток достаточно.
    stalls = next.number === lastIssue ? stalls + 1 : 0;
    if (stalls >= 2) {
      console.log(
        `⛔ Issue #${next.number} не закрыта после повторной попытки. Останавливаюсь.`,
      );
      saveCounter(count, i);
      process.exit(1);
    }
    lastIssue = next.number;

    count++;
    saveCounter(count, i);
    console.log(
      `🔄 Фаза ${i + 1} — Итерация ${count}/${config.maxIterations} — Issue #${next.number}: ${next.title}`,
    );
    console.log(`📋 Осталось: ${issues.length}`);

    if (!runClaude([buildPrompt(phase), '--max-turns', `${config.maxTurns}`])) {
      console.error(
        '⚠️ Сессия claude завершилась с ошибкой (лимит использования или сбой). Останавливаюсь.',
      );
      process.exit(1);
    }
  }

  console.log(`✅ Фаза ${i + 1} завершена. Создаём PR...`);
  saveCounter(0, i + 1);

  runClaude([
    `Создай PR из ветки ${phase.branch} в main с названием 'feat: ${phase.milestone}'. Если PR уже существует, ничего не создавай.`,
    '--model',
    'claude-opus-4-7',
    '--max-turns',
    '10',
  ]) || console.error('⚠️ Не удалось создать PR.');

  console.log('🔍 Ревью Opus ...');
  runClaude([
    `Проведи детальное code review PR из ветки ${phase.branch}. Проверь архитектуру, безопасность, производительность и соответствие PRD. Оставь комментарии в PR через gh cli.`,
    '--model',
    'claude-opus-5-5',
    '--max-turns',
    `${config.maxTurns}`,
  ]) || console.error('⚠️ Ревью не выполнено.');

  if (i + 1 < config.phases.length) {
    // Новая ветка создаётся от main, а не от ветки предыдущей фазы.
    execSync('git checkout main', { stdio: 'inherit' });
    execSync('git pull --ff-only', { stdio: 'inherit' });
  }
}

console.log('🎉 Все фазы завершены!');
