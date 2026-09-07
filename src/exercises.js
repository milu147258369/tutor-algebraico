export const ExerciseBank = (() => {
  const levels = ['Básico', 'Intermedio', 'Avanzado']
  const vars = ['x', 'y', 'a', 'b', 'n', 'm']
  const ops = [
    { w: 'el doble de', c: '2*', prefix: '2*(' },
    { w: 'el triple de', c: '3*', prefix: '3*(' },
    { w: 'la mitad de', c: '/2', prefix: '(' }
  ]

  const bank = []
  // generate a smaller, still varied bank for demo
  for (let i = 1; i <= 300; i++) {
    const lvlIdx = i <= 100 ? 0 : i <= 200 ? 1 : 2
    const v = vars[i % vars.length]
    const op = ops[i % ops.length]
    const k = (i % 10) + 1

    let item = {
      id: `P${String(i).padStart(3, '0')}`,
      level: levels[lvlIdx],
      statement: '',
      answer: '',
      targetErrors: {}
    }

    if (lvlIdx === 0) {
      item.statement = `${op.w} la suma de ${v} y ${k}.`
      item.answer = op.c === '/2' ? `(${v}+${k})/2` : `${op.c}(${v}+${k})`
      item.targetErrors = { [`${op.c}${v}+${k}`]: 'E1b', [`${v}+${k}`]: 'E1a' }
    } else if (lvlIdx === 1) {
      item.statement = `El cociente entre el cuadrado de ${v} y la raíz de ${k}.`
      item.answer = `${v}^2/sqrt(${k})`
      item.targetErrors = { [`${v}/sqrt(${k})`]: 'E2b', [`${v}^2*sqrt(${k})`]: 'E1a' }
    } else {
      item.statement = `La raíz de la diferencia entre el cubo de ${v} y ${k}, disminuida en 5.`
      item.answer = `sqrt(${v}^3-${k})-5`
      item.targetErrors = {
        [`sqrt(${v}^3-${k}-5)`]: 'E1a',
        [`sqrt(${v}^2-${k})-5`]: 'E2b',
        [`sqrt(${v}^3+${k})-5`]: 'E2a'
      }
    }

    bank.push(item)
  }
  return bank
})()
