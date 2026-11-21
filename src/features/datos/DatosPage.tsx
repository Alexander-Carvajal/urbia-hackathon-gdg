import { Download, FileDown, FileJson, FileSpreadsheet, FileUp, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CategoryTag, Notice, PageHeader } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import { CATEGORIES, CATEGORY_IDS } from '../../data/categories'
import { zoneById } from '../../data/zones'
import { CSV_TEMPLATE, download, parseDocument, toCsv, toGeoJson, type ParseResult } from '../../lib/documents'
import type { CategoryId } from '../../types'
import { accessUrl } from '../auth/demoSession'
import { useReports } from '../reports/store'

const MAX_IMPORT = 500

export function DatosPage() {
  const { reports, importReports, demoProfile } = useReports()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const loginUrl = accessUrl(location.pathname + location.search)
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<{ name: string; result: ParseResult } | null>(null)
  const [err, setErr] = useState('')
  const [fallback, setFallback] = useState<CategoryId | ''>('')
  const [rawText, setRawText] = useState('')
  const [expCat, setExpCat] = useState<CategoryId | 'todos'>('todos')

  const toExport = useMemo(() => (expCat === 'todos' ? reports : reports.filter((r) => r.category === expCat)), [reports, expCat])
  const imported = reports.filter((r) => r.importedFrom)

  const parse = (text: string, name: string, fb: CategoryId | '') => {
    try {
      const result = parseDocument(text, name, fb || null)
      setFile({ name, result }); setErr('')
    } catch (e) { setFile(null); setErr((e as Error).message) }
  }

  const onFile = async (f: File | undefined) => {
    if (!demoProfile) { navigate(loginUrl); return }
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setErr('El archivo supera 5 MB.'); return }
    const text = await f.text()
    setRawText(text)
    parse(text, f.name, fallback)
  }

  const doImport = () => {
    if (!demoProfile) { navigate(loginUrl); return }
    if (!file) return
    const items = file.result.items.slice(0, MAX_IMPORT)
    const n = importReports(items, file.name)
    toast(`Se registraron ${n} reportes desde «${file.name}».`)
    setFile(null); setRawText('')
    if (input.current) input.current.value = ''
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const uploadPrompt = <><Upload size={26} className="text-primary" aria-hidden="true" /><span className="text-sm font-semibold">Arrastra un archivo o haz clic para elegirlo</span><span className="text-xs text-muted">.geojson, .json o .csv · máx. 5 MB</span></>
  const uploadClass = 'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#B7D6EE] bg-bg px-4 py-8 text-center hover:bg-soft'

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-8 md:py-7">
      <PageHeader title="Datos y documentos" subtitle="Registra baches y zonas encharcadas o inundadas desde archivos GeoJSON o CSV, y descarga los reportes como datos abiertos." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card flex flex-col gap-4 p-5" aria-labelledby="imp-title">
          <h2 id="imp-title" className="flex items-center gap-2 text-base font-bold"><FileUp size={19} className="text-primary" aria-hidden="true" /> Importar documento</h2>
          {!demoProfile && <Notice>Para importar reportes, <Link to={loginUrl} className="font-semibold text-primary-strong underline">inicia una sesión de demostración</Link>. La exportación sigue disponible.</Notice>}
          <p className="help">
            Acepta <strong>GeoJSON</strong> (puntos, líneas o polígonos; los polígonos de zonas inundadas se registran en su centro) o <strong>CSV</strong> con columnas
            <code className="mx-1 rounded bg-bg px-1">categoria, titulo, descripcion, referencia, lat, lng, fecha</code>. La categoría acepta «bache», «inundación», «encharcamiento» o «agua».
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="fallback-cat">Categoría si el documento no la indica</label>
            <select id="fallback-cat" className="input" value={fallback} onChange={(e) => { const v = e.target.value as CategoryId | ''; setFallback(v); if (rawText && file) parse(rawText, file.name, v) }}>
              <option value="">Detectar automáticamente</option>
              {CATEGORY_IDS.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
            </select>
          </div>
          {demoProfile
            ? <label htmlFor="doc-file" className={`${uploadClass} cursor-pointer`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]) }}>{uploadPrompt}</label>
            : <button type="button" className={uploadClass} onClick={() => navigate(loginUrl)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); navigate(loginUrl) }}>{uploadPrompt}</button>}
          <input ref={input} id="doc-file" type="file" accept=".geojson,.json,.csv,application/geo+json,application/json,text/csv" className="sr-only" disabled={!demoProfile} onChange={(e) => onFile(e.target.files?.[0])} />
          <button type="button" className="btn btn-ghost self-start !min-h-9 !px-2 text-sm" onClick={() => download('plantilla-urbia.csv', CSV_TEMPLATE, 'text/csv;charset=utf-8')}>
            <FileDown size={16} aria-hidden="true" /> Descargar plantilla CSV
          </button>
          {err && <p role="alert" className="text-sm font-medium text-danger">{err}</p>}

          {file && (
            <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
              <p className="text-sm"><strong>{file.name}</strong>: {file.result.items.length} registro(s) válidos{file.result.skipped.length ? `, ${file.result.skipped.length} omitido(s)` : ''}.</p>
              {file.result.items.length > 0 && (
                <ul className="flex max-h-56 flex-col gap-1.5 overflow-auto">
                  {file.result.items.slice(0, 50).map((it, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px]">
                      <CategoryTag category={it.category} />
                      <span className="min-w-0 flex-1 truncate">{it.title}</span>
                      <span className="shrink-0 text-xs text-muted">{zoneById(it.zoneId)?.name}</span>
                    </li>
                  ))}
                </ul>
              )}
              {file.result.skipped.length > 0 && (
                <details className="text-xs text-muted"><summary className="cursor-pointer">Ver omitidos</summary>
                  <ul className="mt-1">{file.result.skipped.slice(0, 30).map((s, i) => <li key={i}>Fila {s.row}: {s.reason}</li>)}</ul>
                </details>
              )}
              {file.result.items.length > MAX_IMPORT && <p className="text-xs text-[#7A3E0E]">Solo se importarán los primeros {MAX_IMPORT}.</p>}
              <div className="flex gap-2">
                <button type="button" className="btn btn-primary" disabled={!file.result.items.length} onClick={doImport}>Registrar {Math.min(file.result.items.length, MAX_IMPORT)} reportes</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setFile(null); setRawText(''); if (input.current) input.current.value = '' }}>Cancelar</button>
              </div>
            </div>
          )}
          <Notice>Los registros importados entran como <strong>Pendiente</strong> con origen «externo» y necesitan corroboración vecinal como cualquier otro reporte.</Notice>
        </section>

        <section className="card flex flex-col gap-4 p-5" aria-labelledby="exp-title">
          <h2 id="exp-title" className="flex items-center gap-2 text-base font-bold"><Download size={19} className="text-primary" aria-hidden="true" /> Exportar datos abiertos</h2>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="exp-cat">Qué exportar</label>
            <select id="exp-cat" className="input" value={expCat} onChange={(e) => setExpCat(e.target.value as CategoryId | 'todos')}>
              <option value="todos">Todos los reportes ({reports.length})</option>
              {CATEGORY_IDS.map((c) => <option key={c} value={c}>{CATEGORIES[c].label} ({reports.filter((r) => r.category === c).length})</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={!toExport.length} onClick={() => download(`urbia-${expCat}-${stamp}.geojson`, JSON.stringify(toGeoJson(toExport), null, 2), 'application/geo+json')}>
              <FileJson size={17} aria-hidden="true" /> GeoJSON
            </button>
            <button type="button" className="btn btn-secondary" disabled={!toExport.length} onClick={() => download(`urbia-${expCat}-${stamp}.csv`, toCsv(toExport), 'text/csv;charset=utf-8')}>
              <FileSpreadsheet size={17} aria-hidden="true" /> CSV (Excel)
            </button>
          </div>
          <p className="help">El GeoJSON se abre en QGIS, geojson.io o Google My Maps; el CSV en Excel o Google Sheets. No incluye fotos ni identificadores de usuarios.</p>
          <div className="mt-auto rounded-xl bg-bg p-3 text-sm">
            <p className="font-semibold">Registros importados en este navegador: {imported.length}</p>
            {imported.length > 0 && <p className="help mt-1">De: {[...new Set(imported.map((r) => r.importedFrom))].join(', ')}. Puedes verlos en <Link to="/reportes" className="font-semibold text-primary-strong underline">Reportes</Link>.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
