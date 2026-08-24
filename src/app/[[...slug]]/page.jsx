'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('@/App.jsx'), {
  ssr: false,
  loading: () => (
    <div id="app">
      <div style={{ paddingTop: '44vh', display: 'flex', justifyContent: 'center', fontSize: 34, color: 'var(--label-3)' }}>
        💪
      </div>
    </div>
  )
});

export default function Page() {
  return <App />;
}
