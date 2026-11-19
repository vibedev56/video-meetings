const { execSync, execFileSync } = require('child_process');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('.claude/ralph.config.json', 'utf8'));

if (!config.active) {
  process.exit(0);
}

// Счётчик итераций
const counterFile = '.claude/ralph.iterations.json';
let counter = { count: 0 };
if (fs.existsSync(counterFile)) {
  counter = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
}

// Проверяем лимит
if (counter.count >= config.maxIterations) {
  console.log(
    `⛔ Достигнут лимит итераций (${config.maxIterations}). Ralph останавливается.`,
  );
  fs.writeFileSync(counterFile, JSON.stringify({ count: 0 }));
  process.exit(0);
}

// Проверяем открытые Issues
const output = execSync(
  `gh issue list --milestone "${config.milestone}" --state open --json number,title`,
).toString();
const issues = JSON.parse(output);

if (issues.length > 0) {
  // Увеличиваем счётчик
  counter.count++;
  fs.writeFileSync(counterFile, JSON.stringify(counter));

  const next = issues[0];
  console.log(
    `🔄 Итерация ${counter.count}/${config.maxIterations} — Issue #${next.number}: ${next.title}`,
  );

  const prompt = config.prompt.replace('{milestone}', config.milestone);
  execSync(`claude -p "${prompt}" --max-turns ${config.maxTurns}`, {
    stdio: 'inherit',
  });
} else {
  // Milestone закрыт — сбрасываем счётчик и создаём PR
  console.log('🔍 Запускаем финальное ревью и PR через Opus...');
  const reviewPrompt =
    'Сделай PR в main и затем проведи детальное code review PR. Проверь архитектуру, безопасность, производительность и соответствие PRD. Оставь комментарии прямо в PR через gh cli.';
  try {
    // Промпт передаём через stdin: при shell:true аргументы с пробелами не экранируются
    execFileSync('claude', ['-p', '--model', 'claude-opus-5-5'], {
      input: reviewPrompt,
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: process.platform === 'win32',
    });
  } catch (err) {
    console.error(`❌ Финальное ревью не удалось: ${err.message}`);
  }
}
