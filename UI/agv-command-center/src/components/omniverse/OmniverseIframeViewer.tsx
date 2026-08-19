import React from 'react';
import { MapPin, Zap, CircleDot } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { SectionTitle } from '../common/SectionTitle';

interface OmniverseIframeViewerProps {
  agvs: AGV[];
  selectedAgv: AGV;
  onSelectAgv: (id: string) => void;
  onFocusCamera?: () => void;
  onHighlightAnomaly?: () => void;
}

export const OmniverseIframeViewer: React.FC<OmniverseIframeViewerProps> = ({
  agvs,
  selectedAgv,
  onSelectAgv,
  onFocusCamera,
  onHighlightAnomaly
}) => {
  const [iframeKey, setIframeKey] = React.useState(0);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);
  const src = 'http://3.86.62.95:8210';

  React.useEffect(() => {
    // start a timeout that marks an error if iframe hasn't loaded
    setIsLoaded(false);
    setIsError(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setIsError(true);
    }, 5000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [iframeKey, src]);

  const handleLoad = () => {
    setIsLoaded(true);
    setIsError(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleRetry = () => {
    setIsError(false);
    setIsLoaded(false);
    setIframeKey(k => k + 1);
  };

  return (
    <div className="panel twin-panel">
      <SectionTitle icon={<MapPin />} title="Omniverse Digital Twin" badge="IFRAME" />
      <div className="viewport" style={{ position: 'relative' }}>
        <div className="viewport-top">
          <span>
            <span className="live-dot"></span> LIVE VIEW
          </span>
          <span>Embedded Iframe</span>
        </div>

        {/* iframe fills the viewport */}
        <iframe
          key={iframeKey}
          title="Omniverse Iframe Viewer"
          src={src}
          onLoad={handleLoad}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: '0', borderRadius: 8 }}
        />

        {/* overlay while loading or on error */}
        {!isLoaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {!isError ? (
              <div style={{ pointerEvents: 'none', color: '#9fb3c8' }}>Loading embedded view…</div>
            ) : (
              <div style={{ pointerEvents: 'auto', background: 'rgba(6,12,18,0.85)', padding: 20, borderRadius: 8, color: '#f0f6fb', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Unable to load embedded view</div>
                <div style={{ marginBottom: 12, color: '#b7c9d8' }}>The iframe source did not respond. You can retry or open in a new tab.</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button className="secondary-btn" onClick={handleRetry}>Retry</button>
                  <a className="secondary-btn" href={src} target="_blank" rel="noreferrer">Open in new tab</a>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      {/* actions hidden for iframe mode but kept for compatibility */}
    </div>
  );
};

export default OmniverseIframeViewer;
