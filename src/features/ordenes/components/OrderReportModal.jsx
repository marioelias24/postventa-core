import { useRef, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useEmpresa } from '@/app/EmpresaContext';
import { tecnicoIdsOf } from '@/shared/lib/orders';

function ReportContent({ order, data, empresaNombre, empresaLogo, empresaData }) {
  const cliente = data.clientes.find(c => c.id === order.clienteId);
  const tipo = data.tipos.find(t => t.id === order.tipoId);
  const estado = data.estados.find(s => s.id === order.estadoId);
  const tecnicos = tecnicoIdsOf(order).map(id => data.tecnicos.find(t => t.id === id)).filter(Boolean);
  const labelOrden = order.numero || `#${order.id}`;
  const fechaDisplay = order.fechaCompletada || order.fechaProgramada;

  const row = (label, value) => value ? (
    <tr key={label}>
      <td style={{ color: '#666', paddingRight: '10px', paddingBottom: '5px', whiteSpace: 'nowrap', verticalAlign: 'top', fontSize: '11px' }}>{label}</td>
      <td style={{ fontWeight: '600', paddingBottom: '5px', fontSize: '12px' }}>{value}</td>
    </tr>
  ) : null;

  return (
    <div
      style={{
        width: '794px',
        backgroundColor: '#ffffff',
        padding: '40px',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: '12px',
        color: '#1a1a1a',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f766e', paddingBottom: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={empresaLogo}
            alt=""
            style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
            crossOrigin="anonymous"
          />
          <div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#111' }}>{empresaNombre}</div>
            {empresaData?.telefono && <div style={{ fontSize: '11px', color: '#666' }}>Tel: {empresaData.telefono}</div>}
            {empresaData?.email && <div style={{ fontSize: '11px', color: '#666' }}>{empresaData.email}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: '2px' }}>Reporte de Servicio</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f766e', lineHeight: '1.1', marginTop: '4px' }}>{labelOrden}</div>
          {fechaDisplay && <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>{fechaDisplay}</div>}
        </div>
      </div>

      {/* ─── Cliente + Visita ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#0f766e', marginBottom: '10px' }}>Cliente</div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{cliente?.nombre || '—'}</div>
          {cliente?.contacto && <div style={{ color: '#555', marginBottom: '3px', fontSize: '12px' }}>{cliente.contacto}</div>}
          {cliente?.telefono && <div style={{ color: '#555', marginBottom: '3px', fontSize: '12px' }}>Tel: {cliente.telefono}</div>}
          {cliente?.email && <div style={{ color: '#555', marginBottom: '3px', fontSize: '11px' }}>{cliente.email}</div>}
          {cliente?.direccion && <div style={{ color: '#777', marginTop: '5px', fontSize: '11px' }}>{cliente.direccion}</div>}
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#0f766e', marginBottom: '10px' }}>Detalle de la visita</div>
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {row('Fecha', order.fechaProgramada ? `${order.fechaProgramada}${order.horaInicio ? ` · ${order.horaInicio}` : ''}` : null)}
              {row('Duración', order.duracionEstimada ? `${order.duracionEstimada} h` : null)}
              {row('Tipo', tipo?.nombre)}
              {row('Estado', estado?.nombre)}
              {row('Técnico(s)', tecnicos.length ? tecnicos.map(t => t.nombre).join(', ') : null)}
              {row('Ref. externa', order.referenciaExterna)}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Equipo ─── */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#0f766e', marginBottom: '6px' }}>Equipo / Activo</div>
        <div style={{ fontSize: '14px', fontWeight: '600' }}>{order.equipo || '—'}</div>
      </div>

      {/* ─── Descripción ─── */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '16px', minHeight: '90px' }}>
        <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#0f766e', marginBottom: '8px' }}>Descripción del trabajo realizado</div>
        <div style={{ fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: order.descripcion ? '#1a1a1a' : '#aaa' }}>
          {order.descripcion || 'Sin descripción registrada.'}
        </div>
      </div>

      {/* ─── Notas ─── */}
      {(order.notas || true) && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '16px', minHeight: '60px' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#0f766e', marginBottom: '8px' }}>Notas y observaciones</div>
          <div style={{ fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: order.notas ? '#1a1a1a' : '#aaa' }}>
            {order.notas || 'Sin notas registradas.'}
          </div>
        </div>
      )}

      {/* ─── Fotos ─── */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#0f766e', marginBottom: '12px' }}>Registro fotográfico</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '130px', border: '1px dashed #d1d5db', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4c4c4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              <div style={{ fontSize: '10px', color: '#bbb' }}>Foto {i}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Firma ─── */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#0f766e', marginBottom: '24px' }}>Conformidad del cliente</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px' }}>
          <div>
            <div style={{ height: '52px', marginBottom: '8px' }}></div>
            <div style={{ borderTop: '1px solid #374151', paddingTop: '6px', fontSize: '10px', color: '#777' }}>Firma del cliente</div>
          </div>
          <div>
            <div style={{ height: '52px', marginBottom: '8px' }}></div>
            <div style={{ borderTop: '1px solid #374151', paddingTop: '6px', fontSize: '10px', color: '#777' }}>Nombre y fecha</div>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#aaa', paddingTop: '10px', borderTop: '1px solid #e5e7eb' }}>
        {empresaNombre} · Generado el {new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

export function OrderReportModal({ order, data, onClose }) {
  const { nombre, logo, empresa } = useEmpresa();
  const contentRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const downloadPDF = async () => {
    if (!contentRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;

      let leftH = imgH;
      let pos = 0;

      pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
      leftH -= pageH;

      while (leftH > 0) {
        pos -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
        leftH -= pageH;
      }

      pdf.save(`Reporte-${order.numero || order.id}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col">
      {/* Barra superior */}
      <div className="bg-white border-b border-stone-200 flex items-center justify-between px-4 py-3 flex-shrink-0 shadow-sm">
        <div>
          <h3 className="font-semibold text-stone-800">Vista previa del reporte</h3>
          <p className="text-xs text-stone-500">{order.numero || `#${order.id}`} · {data.clientes.find(c => c.id === order.clienteId)?.nombre || 'Sin cliente'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadPDF}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium text-sm disabled:opacity-60"
          >
            {generating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />
            }
            {generating ? 'Generando…' : 'Descargar PDF'}
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Área de vista previa */}
      <div className="flex-1 overflow-auto bg-stone-200 flex justify-center py-8 px-4">
        <div ref={contentRef} className="shadow-2xl">
          <ReportContent
            order={order}
            data={data}
            empresaNombre={nombre}
            empresaLogo={logo}
            empresaData={empresa}
          />
        </div>
      </div>
    </div>
  );
}
