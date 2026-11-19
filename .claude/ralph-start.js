const { execSync } = require('child_process');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('.claude/ralph.config.json', 'utf8'));

// Индекс фазы можно передать аргументом: node .claude/ralph-start.js 2
const phaseIndex = Number.parseInt(process.argv[2] ?? '0', 10);

const phase = config.phases
  ? config.phases[phaseIndex]
  : { milestone: config.milestone, branch: config.branch };

if (!phase) {
  console.error(
    `Фаза с индексом ${process.argv[2]} не найдена в ralph.config.json`,
  );
  process.exit(1);
}

// Сбрасываем счётчик итераций и запоминаем фазу
fs.writeFileSync(
  '.claude/ralph.iterations.json',
  JSON.stringify({ count: 0, phaseIndex }),
);

// Запускаем первую итерацию
const prompt = config.prompt
  .replaceAll('{milestone}', phase.milestone)
  .replaceAll('{branch}', phase.branch);
console.log(
  `🚀 Запускаем Ralph для milestone: ${phase.milestone} (ветка ${phase.branch})`,
);

execSync(`claude -p "${prompt}" --max-turns ${config.maxTurns}`, {
  stdio: 'inherit',
});
