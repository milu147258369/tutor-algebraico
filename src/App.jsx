import React, { useState, useEffect, useMemo, useRef } from 'react'
import { simplify, parse } from 'mathjs'
import MathNode from './components/MathNode'
import { loadJSON, saveJSON } from './utils/storage'
import { ExerciseBank } from './exercises'

const ERROR_TAXONOMY = {
  E1a: 'Error de Jerarquía: Colocaste el término fuera de la raíz o paréntesis dentro del operador principal.',
  E1b: 'Error de Agrupación: Faltan paréntesis para agrupar los términos de una suma, resta o cociente.',
  E2a: "Error de Signos: Invertiste el operador positivo/negativo ('diferencia' usa '-' y 'aumentado' usa '+').",
  E2b: 'Error de Exponentes/Radicales: Confundiste el orden de potencias (^2, ^3) o el alcance del radical sqrt().',
  E2c: 'Error de Coeficiente: Alteraste los números multiplicadores o el divisor principal de la variable.',
  E3a: 'Error de Sintaxis: Tu expresión contiene paréntesis desbalanceados o símbolos incompletos.',
  E3b: 'Error Lógico Verbal: La expresión traducida no refleja el orden en que se lee el enunciado verbal.'
}

const PEDAGOGICAL_GUIDES = {
  E1a: [
    "Paso 1: Identifica si hay términos 'disminuidos' o 'aumentados' al final de la frase (ej. 'disminuida en 5').",
    'Paso 2: Cierra el paréntesis de la raíz o de la operación principal ANTES de escribir la suma o resta final.',
    'Paso 3: Verifica que la resta no quede encerrada dentro del bloque sqrt(...).'
  ],
  E1b: [
    "Paso 1: Ubica las operaciones compuestas (ej. 'la suma de x y 5').",
    "Paso 2: Agrúpalas con paréntesis '(x+5)' antes de aplicar la multiplicación, división o potencia.",
    'Paso 3: Asegúrate de que el multiplicador o divisor afecte a todo el grupo entre paréntesis.'
  ],
  E2a: [
    "Paso 1: Identifica las palabras clave: 'diferencia' (-) y 'disminuida' (-) significan resta; 'suma' (+) y 'aumentada' (+) significan adición.",
    "Paso 2: Revisa cada signo de tu expresión de izquierda a derecha."
  ],
  E2b: [
    "Paso 1: Para 'el cuadrado' usa ^2; para 'el cubo' usa ^3; para 'la raíz de' usa sqrt(...).",
    "Paso 2: Asegúrate de colocar el exponente directamente junto a la variable correspondiente (ej. x^3)."
  ],
  E2c: [
    'Paso 1: Identifica las constantes numéricas del enunciado.',
    'Paso 2: Confirma que no hayas omitido ningún número al transcribir la respuesta.'
  ],
  E3a: [
    "Paso 1: Cuenta los paréntesis de apertura '(' y asegúrate de tener la misma cantidad de paréntesis de cierre ')'.",
    "Paso 2: Verifica que no haya operadores dobles seguidos (como ++ o **)."
  ],
  E3b: [
    'Paso 1: Lee el enunciado por partes y traduce cada bloque en orden.',
    'Paso 2: Compara el número de variables y operaciones de tu fórmula con el texto original.'
  ]
}

function normalizeExpression(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .replace(/\s+/g, '')
    .replace(/√\(/g, 'sqrt(')
    .replace(/√([a-zA-Z0-9])/g, 'sqrt($1)')
    .replace(/\^\{(\d+)\}/g, '^$1')
}

function checkEquivalent(a, b) {
  try {
    // mathjs simplify and compare is more robust than string equality
    const sa = simplify(a)
    const sb = simplify(b)
    return sa.equals(sb)
  } catch (e) {
    return a === b
  }
}

export default function App() {
  const [view, setView] = useState('login')
  const [student, setStudent] = useState({ name: '', progress: 0 })
  const [level, setLevel] = useState('Básico')
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [logs, setLogs] = useState(() => loadJSON('algebra_tutor_v3_logs', []))
  const inputRef = useRef(null)

  useEffect(() => saveJSON('algebra_tutor_v3_logs', logs), [logs])

  const handleLogin = (e) => {
    e.preventDefault()
    const name = (e.target.studentID.value || '').trim().toUpperCase()
    if (!name) return
    const savedProgress = parseInt(localStorage.getItem(`prog_v3_${name}`) || '0', 10) || 0
    setStudent({ name, progress: savedProgress })
    setView('tutor')
  }

  const currentExercise = useMemo(() => {
    const filtered = ExerciseBank.filter((ex) => ex.level === level)
    return filtered[student.progress % filtered.length]
  }, [student.progress, level])

  const evaluate = () => {
    const cleanInput = normalizeExpression(input)
    const cleanAnswer = normalizeExpression(currentExercise.answer)

    const isCorrect = checkEquivalent(cleanInput, cleanAnswer)
    let errorType = 'E0'

    if (!isCorrect) {
      if (currentExercise.targetErrors[cleanInput]) {
        errorType = currentExercise.targetErrors[cleanInput]
      } else if (cleanInput.includes('sqrt') && cleanInput.endsWith('-5)') && cleanAnswer.endsWith(')-5')) {
        errorType = 'E1a'
      } else if (cleanInput.includes('sqrt') !== cleanAnswer.includes('sqrt')) {
        errorType = 'E2b'
      } else if ((cleanInput.match(/\(/g) || []).length !== (cleanAnswer.match(/\(/g) || []).length) {
        errorType = 'E3a'
      } else {
        errorType = 'E3b'
      }
    }

    const logEntry = {
      student: student.name,
      exerciseId: currentExercise.id,
      level: level,
      input: input,
      result: isCorrect ? 'Correcto' : 'Incorrecto',
      errorCategory: isCorrect ? 'Ninguno' : errorType,
      timestamp: new Date().toISOString()
    }

    setLogs((prev) => [logEntry, ...prev])

    if (isCorrect) {
      setFeedback({ type: 'success', msg: '¡Excelente! Interpretaste el enunciado correctamente.' })
      setTimeout(() => {
        const nextProg = student.progress + 1
        setStudent((prev) => ({ ...prev, progress: nextProg }))
        localStorage.setItem(`prog_v3_${student.name}`, String(nextProg))
        setInput('')
        setFeedback(null)
      }, 1200)
    } else {
      setFeedback({ type: 'error', category: errorType, msg: ERROR_TAXONOMY[errorType] || 'Revisa la congruencia de tu expresión con el enunciado.', steps: PEDAGOGICAL_GUIDES[errorType] || PEDAGOGICAL_GUIDES.E3b })
    }
  }

  const exportCSV = () => {
    const csvEscape = (v) => `"${String(v).replace(/"/g, '""')}"`
    const headers = ['Estudiante', 'ID_Ejercicio', 'Nivel', 'Respuesta', 'Resultado', 'Taxonomia_Error', 'Fecha']
    const rows = logs.map((l) => [l.student, l.exerciseId, l.level, l.input, l.result, l.errorCategory, l.timestamp].map(csvEscape).join(','))
    const blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Reporte_Docente_Algebra_v3_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
        <div className="glass p-8 rounded-2xl w-full max-w-md">
          <h1 className="text-2xl font-extrabold text-indigo-600 mb-2">AlgebraTutor v3.1</h1>
          <p className="text-slate-400 mb-6">SISTEMA ADAPTATIVO UNIVERSITARIO</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="sr-only" htmlFor="studentID">CÓDIGO O NOMBRE</label>
            <input id="studentID" name="studentID" required placeholder="CÓDIGO O NOMBRE" className="w-full p-3 rounded-lg" />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">INGRESAR</button>
              <button type="button" onClick={() => setView('teacher')} className="px-4 py-2 border rounded-lg">Panel Docente</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (view === 'teacher') {
    const stats = {
      totalBank: ExerciseBank.length,
      basic: ExerciseBank.filter((e) => e.level === 'Básico').length,
      inter: ExerciseBank.filter((e) => e.level === 'Intermedio').length,
      adv: ExerciseBank.filter((e) => e.level === 'Avanzado').length,
      students: new Set(logs.map((l) => l.student)).size
    }

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-black">Panel de Analítica Docente</h2>
              <p className="text-slate-500">Taxonomía Específica de Errores y Diagnóstico</p>
            </div>
            <div className="flex gap-3">
              <button onClick={exportCSV} className="px-4 py-2 bg-emerald-600 text-white rounded">Exportar CSV</button>
              <button onClick={() => setView('login')} className="px-4 py-2 border rounded">Salir</button>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white rounded">Banco: {stats.totalBank}</div>
            <div className="p-4 bg-white rounded">Estudiantes: {stats.students}</div>
            <div className="p-4 bg-white rounded">Interacciones: {logs.length}</div>
            <div className="p-4 bg-white rounded">B: {stats.basic} I: {stats.inter} A: {stats.adv}</div>
          </section>

          <section className="bg-white p-4 rounded">
            <h3 className="font-bold mb-2">Registro</h3>
            <div className="overflow-auto max-h-96">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400 uppercase">
                  <tr>
                    <th>ID</th>
                    <th>Estudiante</th>
                    <th>Nivel</th>
                    <th>Entrada</th>
                    <th>Resultado</th>
                    <th>Diagnóstico</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2">{l.exerciseId}</td>
                      <td className="py-2">{l.student}</td>
                      <td className="py-2">{l.level}</td>
                      <td className="py-2 font-mono">{l.input}</td>
                      <td className="py-2">{l.result}</td>
                      <td className="py-2">{l.errorCategory !== 'Ninguno' ? `${l.errorCategory}: ${ERROR_TAXONOMY[l.errorCategory]}` : 'Sin errores'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-12">
      <nav className="bg-white sticky top-0 border-b p-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-indigo-600 text-white flex items-center justify-center font-bold">{(student.name || 'A')[0]}</div>
            <div>
              <p className="text-xs text-slate-400">Estudiante Activo</p>
              <p className="font-bold">{student.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {['Básico', 'Intermedio', 'Avanzado'].map((l) => (
              <button key={l} onClick={() => { setLevel(l); setInput(''); setFeedback(null) }} className={`px-3 py-1 rounded ${level === l ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>{l}</button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 px-4">
        <div className="lg:col-span-8">
          <section className="bg-white p-6 rounded">
            <div className="mb-4">
              <span className="text-xs text-indigo-500">Desafío {currentExercise.id}</span>
              <h2 className="text-2xl font-extrabold">{currentExercise.statement}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="sr-only" htmlFor="algebraInput">Entrada algebraica</label>
                <input id="algebraInput" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} className="w-full p-4 rounded text-xl font-mono border" placeholder="Traduce a lenguaje algebraico..." />
                <div className="mt-2 flex gap-2">
                  <button onClick={evaluate} className="px-4 py-2 bg-indigo-600 text-white rounded">Comprobar</button>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-6 rounded">
                <div className="text-2xl">
                  {input ? <MathNode formula={input} display={true} /> : <span className="text-slate-400">Esperando entrada simbólica...</span>}
                </div>
              </div>

              {feedback && (
                <div role="status" aria-live="polite" className={`p-4 rounded ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-50'}`}>
                  {feedback.type === 'success' ? (
                    <div className="font-bold">{feedback.msg}</div>
                  ) : (
                    <div>
                      <div className="font-bold text-rose-600">{feedback.category}</div>
                      <p className="font-semibold">{feedback.msg}</p>
                      <ol className="mt-2 list-decimal list-inside">
                        {feedback.steps && feedback.steps.map((s, i) => <li key={i}>{s.replace(/^Paso \d+: /, '')}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4">
          <div className="bg-white p-4 rounded sticky top-20">
            <h3 className="text-xs font-black text-slate-400 uppercase">Teclado Matemático</h3>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {['x', 'y', 'a', 'b', 'n', '^', '(', ')'].map((s) => (
                <button key={s} onClick={() => { const start = inputRef.current.selectionStart || input.length; const text = input.slice(0, start) + s + input.slice(start); setInput(text) }} className="p-2 bg-slate-100 rounded">{s}</button>
              ))}
              {['+', '-', '*', '/', '^2', '^3', 'sqrt(', '√('].map((s) => (
                <button key={s} onClick={() => { const start = inputRef.current.selectionStart || input.length; const text = input.slice(0, start) + s + input.slice(start); setInput(text) }} className="p-2 bg-slate-50 rounded text-indigo-600">{s}</button>
              ))}
            </div>

            <div className="mt-4 text-xs text-slate-500 flex justify-between">
              <span>Tu Historial</span>
              <span className="text-indigo-600">{logs.filter((l) => l.student === student.name && l.result === 'Correcto').length} Logrados</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
