const CHART_COLORS = [
  '#2563eb', '#16a34a', '#ea580c', '#9333ea', '#64748b',
  '#dc2626', '#0891b2', '#ca8a04', '#be185d',
];

function drawBarChart(canvas, labels, values, options = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 20, right: 20, bottom: 50, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  ctx.clearRect(0, 0, w, h);

  if (!values.length) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data', w / 2, h / 2);
    return;
  }

  const maxVal = Math.max(...values, 1);
  const barGap = 8;
  const barW = Math.min(60, (chartW - barGap * (values.length - 1)) / values.length);

  values.forEach((val, i) => {
    const barH = (val / maxVal) * chartH;
    const x = padding.left + i * (barW + barGap) + (chartW - values.length * (barW + barGap) + barGap) / 2;
    const y = padding.top + chartH - barH;

    ctx.fillStyle = options.colors?.[i] || CHART_COLORS[i % CHART_COLORS.length];
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(val, x + barW / 2, y - 6);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    const label = labels[i];
    const maxLabelW = barW + 10;
    if (ctx.measureText(label).width > maxLabelW) {
      ctx.save();
      ctx.translate(x + barW / 2, padding.top + chartH + 14);
      ctx.rotate(-0.4);
      ctx.textAlign = 'right';
      ctx.fillText(label.length > 12 ? label.slice(0, 10) + '…' : label, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(label, x + barW / 2, padding.top + chartH + 16);
    }
  });
}

function drawPieChart(canvas, labels, values) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const total = values.reduce((a, b) => a + b, 0);
  if (!total) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data', w / 2, h / 2);
    return;
  }

  const cx = w * 0.38;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.32;
  let startAngle = -Math.PI / 2;

  values.forEach((val, i) => {
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();
    startAngle += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const legendX = w * 0.62;
  let legendY = 40;
  labels.forEach((label, i) => {
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(legendX, legendY, 12, 12);
    ctx.fillStyle = '#0f172a';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    const pct = Math.round((values[i] / total) * 100);
    ctx.fillText(`${label} (${values[i]}, ${pct}%)`, legendX + 18, legendY + 10);
    legendY += 24;
  });
}

const STATUS_CHART_COLORS = {
  'ToDo': '#94a3b8',
  'Intake': '#64748b',
  'In Progress': '#ea580c',
  'Review': '#9333ea',
  'Done': '#16a34a',
};

function statusColors(labels) {
  return labels.map(l => STATUS_CHART_COLORS[l] || CHART_COLORS[0]);
}
