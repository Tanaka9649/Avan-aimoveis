export default function AdminLoading() {
  return (
    <div className="admin-content admin-generic-loading" aria-label="Carregando conteúdo" aria-busy="true">
      <div className="skeleton-heading"><span/><strong/><small/></div>
      <div className="skeleton-toolbar"><span/><span/><i/></div>
      <div className="skeleton-table">
        <header><span/><span/><span/><span/></header>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index}><strong/><span/><span/><i/></div>
        ))}
      </div>
    </div>
  );
}
