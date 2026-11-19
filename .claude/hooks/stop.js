const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Хук может запуститься из любого каталога: работаем из корня репозитория.
process.chdir(path.resolve(__dirname, '..', '..'));

// Защита от повторного входа: сессии claude, которые запускает сам хук
// (PR, ревью, следующая итерация), тоже вызывают Stop-хук.
if (process.env.RALPH_CHILD === '1') process.exit(0);

const config = JSON.parse(fs.readFileSync('.claude/ralph.config.json', 'utf8'));

if (!config.active) process.exit(0);

const counterFile = '.claude/ralph.iterations.json';
let counter = { count: 0, phaseIndex: 0 };
if (fs.existsSync(counterFile)) {
  counter = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
}

const save = () => fs.writeFileSync(counterFile, JSON.stringify(counter));

const phase = config.phases
  ? config.phases[counter.phaseIndex]
  : { milestone: config.milestone, branch: config.branch };

if (!phase) {
  console.log('🎉 Все фазы завершены.');
  process.exit(0);
}

if (counter.count >= config.maxIterations) {
  console.log(`⛔ Лимит итераций (${config.maxIterations}) достигнут.`);
  counter.count = 0;
  save();
  process.exit(0);
}

const buildPrompt = (p) =>
  config.prompt
    .replaceAll('{milestone}', p.milestone)
    .replaceAll('{branch}', p.branch);

// Запуск вложенного claude: дочерние сессии не запускают хук повторно.
const runClaude = (args) =>
  execSync(`claude -p ${args}`, {
    stdio: 'inherit',
    env: { ...process.env, RALPH_CHILD: '1' },
  });

// Следующая итерация сама должна продолжать цепочку, поэтому
// запускается без RALPH_CHILD.
const runIteration = (p) =>
  execSync(`claude -p "${buildPrompt(p)}" --max-turns ${config.maxTurns}`, {
    stdio: 'inherit',
  });

const issues = JSON.parse(
  execSync(
    `gh issue list --milestone "${phase.milestone}" --state open --json number,title`,
  ).toString(),
);

if (issues.length > 0) {
  counter.count++;
  save();

  const next = issues[0];
  console.log(
    `🔄 Фаза ${counter.phaseIndex + 1} — Итерация ${counter.count}/${config.maxIterations} — Issue #${next.number}: ${next.title}`,
  );
  console.log(`📋 Осталось: ${issues.length}`);

  runIteration(phase);
} else {
  console.log(`✅ Фаза ${counter.phaseIndex + 1} завершена. Создаём PR...`);

  // Переходим к следующей фазе сразу: сбой PR или ревью не должен
  // блокировать цепочку.
  const finished = phase;
  counter.phaseIndex++;
  counter.count = 0;
  save();

  try {
    runClaude(
      `"Создай PR из ветки ${finished.branch} в main с названием 'feat: ${finished.milestone}'. Если PR уже существует, ничего не создавай." --model claude-opus-4-7 --max-turns 10`,
    );
  } catch (e) {
    console.error('⚠️ Не удалось создать PR:', e.message);
  }

  console.log('🔍 Ревью Opus ...');
  try {
    runClaude(
      `"Проведи детальное code review PR из ветки ${finished.branch}. Проверь архитектуру, безопасность, производительность и соответствие PRD. Оставь комментарии в PR через gh cli." --model claude-opus-5-5 --max-turns ${config.maxTurns}`,
    );
  } catch (e) {
    console.error('⚠️ Ревью не выполнено:', e.message);
  }

  const nextPhase = config.phases ? config.phases[counter.phaseIndex] : null;
  if (!nextPhase) {
    console.log('🎉 Все фазы завершены!');
    process.exit(0);
  }

  console.log(`➡️ Фаза ${counter.phaseIndex + 1}: ${nextPhase.milestone}`);
  // Новая ветка создаётся от main, а не от ветки предыдущей фазы.
  execSync('git checkout main', { stdio: 'inherit' });
  execSync('git pull --ff-only', { stdio: 'inherit' });
  runIteration(nextPhase);
}
