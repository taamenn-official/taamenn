import type { RouteId } from '../config/routes';

export function RouteSkeleton({ page }: { page: RouteId }) {
  if (page === 'home') {
    return (
      <section className="page-content home-page" aria-busy="true">
        <div className="skeleton-line is-title" />
        <div className="skeleton-block is-next" />
        <div className="skeleton-grid">
          <div className="skeleton-block" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      </section>
    );
  }
  if (page === 'archive') {
    return (
      <section className="page-content" aria-busy="true">
        <div className="skeleton-line is-title" />
        <div className="skeleton-row" />
        <div className="skeleton-list">{[0, 1, 2, 3].map(item => <div key={item} className="skeleton-block is-row" />)}</div>
      </section>
    );
  }
  if (page === 'stadiums') {
    return (
      <section className="page-content" aria-busy="true">
        <div className="skeleton-line is-title" />
        <div className="skeleton-list">{[0, 1, 2].map(item => <div key={item} className="skeleton-block is-venue" />)}</div>
      </section>
    );
  }
  if (page === 'profile') {
    return (
      <section className="page-content" aria-busy="true">
        <div className="skeleton-block is-profile" />
      </section>
    );
  }
  if (page === 'tactical') {
    return (
      <section className="page-content" aria-busy="true">
        <div className="skeleton-block is-pitch" />
      </section>
    );
  }
  return (
    <section className="page-content" aria-busy="true">
      <div className="skeleton-line is-title" />
      <div className="skeleton-block" />
    </section>
  );
}
