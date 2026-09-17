export default function AdminLoading() {
  return (
    <div className="admin-content" aria-label="Carregando conteúdo" aria-busy="true">
      <div className="skeleton-heading"><span /><strong /><small /></div>
      <div className="metric-grid skeleton-grid">
        {Array.from({ length: 8 }, (_, index) => <div className="skeleton-card" key={index}><span /><strong /><small /></div>)}
      </div>
      <div className="skeleton-panel"><span /><i /><i /><i /></div>
    </div>
  );
}
