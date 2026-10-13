import { MapCard } from './components/MapCard';
import { PUBLIC_URL } from './config/mapConfig';
import { MAX_WIDTH } from './hooks/useWidth';
import { useTheme } from './lib/theme';
import { getMap, MAPS } from './maps';

export default function App() {
  const theme = useTheme();
  const id = new URLSearchParams(window.location.search).get('map');

  if (!id) return <Overview theme={theme} />;
  const def = getMap(id);
  if (!def) return <NotFound id={id} />;
  return <MapCard def={def} theme={theme} />;
}

/** Sans `?map=` : URL d'embed en tête, puis toutes les cartes empilées. */
function Overview({ theme }) {
  const hash = theme === 'dark' ? '#theme=dark' : '';
  return (
    <main className="mx-auto flex flex-col gap-10 py-4 font-body text-ink" style={{ maxWidth: MAX_WIDTH }}>
      <section className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[19px] leading-[1.2] font-bold antialiased">URL d’embed</h1>
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-[12.5px] leading-[1.35]">
          {MAPS.map((def, i) => (
            <li key={def.id} className="flex flex-col">
              <span className="font-semibold">
                {i + 1}. {def.title}
              </span>
              <a className="break-all text-ink-brand" href={`?map=${def.id}${hash}`}>{`${PUBLIC_URL}?map=${def.id}`}</a>
            </li>
          ))}
        </ol>
      </section>
      {MAPS.map((def) => (
        <MapCard key={def.id} def={def} theme={theme} />
      ))}
    </main>
  );
}

function NotFound({ id }) {
  return (
    <p className="m-0 p-4 font-body text-ink">
      Carte inconnue : <code>{id}</code>. Valeurs possibles : {MAPS.map((m) => m.id).join(', ')}.
    </p>
  );
}
