import { useEffect, useRef, useState } from 'react';
import type { ProtoScreen, Hotspot, MicroInteraction } from '../../types/prototype';

interface Props {
  screen: ProtoScreen;
  phase: 'entering' | 'active' | 'leaving';
  onHotspotClick: (hotspot: Hotspot) => void;
}

function MicroAnimationZone({ micro, phase }: { micro: MicroInteraction; phase: Props['phase'] }) {
  const [animClass, setAnimClass] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (micro.trigger === 'on-enter' && phase === 'active') {
      timerRef.current = setTimeout(() => {
        setAnimClass(`micro-animate-${micro.animation}`);
      }, micro.delay);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, micro]);

  const handleMouseEnter = () => {
    if (micro.trigger !== 'on-hover') return;
    setAnimClass(`micro-animate-${micro.animation}`);
  };

  const handleMouseLeave = () => {
    if (micro.trigger !== 'on-hover') return;
    setAnimClass('');
  };

  const handleClick = () => {
    if (micro.trigger !== 'on-click') return;
    setAnimClass('');
    requestAnimationFrame(() => {
      setAnimClass(`micro-animate-${micro.animation}`);
    });
  };

  return (
    <div
      className={`absolute pointer-events-auto ${animClass}`}
      style={{
        left: `${micro.rect.x}%`,
        top: `${micro.rect.y}%`,
        width: `${micro.rect.width}%`,
        height: `${micro.rect.height}%`,
        ['--mi-duration' as string]: `${micro.duration}ms`,
        ['--mi-easing' as string]: micro.easing,
        ['--mi-delay' as string]: `${micro.delay}ms`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
}

export default function ScreenRenderer({ screen, phase, onHotspotClick }: Props) {
  return (
    <div className="relative w-full h-full">
      <img
        src={screen.imageDataUrl}
        alt={screen.name}
        className="absolute inset-0 w-full h-full object-contain select-none"
        draggable={false}
      />

      {/* Hotspot click zones */}
      {screen.hotspots.map((hs) => (
        <div
          key={hs.id}
          className="preview-hotspot-zone"
          style={{
            left: `${hs.rect.x}%`,
            top: `${hs.rect.y}%`,
            width: `${hs.rect.width}%`,
            height: `${hs.rect.height}%`,
            cursor: hs.targetScreenId ? 'pointer' : 'default',
          }}
          onClick={() => hs.targetScreenId && onHotspotClick(hs)}
        />
      ))}

      {/* Micro-interaction zones */}
      {screen.microInteractions.map((m) => (
        <MicroAnimationZone key={m.id} micro={m} phase={phase} />
      ))}
    </div>
  );
}
