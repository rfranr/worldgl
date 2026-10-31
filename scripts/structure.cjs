const fs = require('node:fs');

const report = JSON.parse(fs.readFileSync(0, 'utf8'));

const graph = new Map(
  report.modules.map(m => [
    m.source,
    (m.dependencies ?? [])
      .filter(d => d.resolved?.startsWith('src/'))
      .map(d => d.resolved)
  ])
);

function reachable(start) {
  const visited = new Set();

  function visit(node) {
    for (const next of graph.get(node) ?? []) {
      if (next === start || visited.has(next)) continue;
      visited.add(next);
      visit(next);
    }
  }

  visit(start);
  return visited.size;
}

function depth(start) {
  function visit(node, path) {
    return Math.max(0, ...(graph.get(node) ?? [])
      .filter(next => !path.has(next))
      .map(next => visit(next, new Set([...path, next])) + 1));
  }

  return visit(start, new Set([start]));
}

console.log('Module'.padEnd(32), 'Fan-out  Transitive  Depth');

for (const node of [...graph.keys()].sort()) {
  console.log(
    node.padEnd(32),
    String(graph.get(node).length).padStart(7),
    String(reachable(node)).padStart(11),
    String(depth(node)).padStart(6)
  );
}

console.log('\nMax dependency depth:', Math.max(...[...graph.keys()].map(depth)));
