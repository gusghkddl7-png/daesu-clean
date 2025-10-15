$mapComp = @"
"use client";

import React, { useEffect, useRef, useState } from "react";
import { loadNaverMaps } from "./useNaverLoader";

type Props = { height?: number; lat?: number; lng?: number; zoom?: number; };

export default function NaverMap({ height = 360, lat = 37.545, lng = 127.142, zoom = 13 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const cid = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID || "";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const naver = await loadNaverMaps(cid);
        if (!mounted) return;
        const map = new naver.maps.Map(ref.current!, {
          center: new naver.maps.LatLng(lat, lng),
          zoom,
        });
        new naver.maps.Marker({ position: map.getCenter(), map });
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
    return () => { mounted = false; };
  }, [cid, lat, lng, zoom]);

  return (
    <div className="space-y-2">
      <div ref={ref} style={{ height }} className="w-full rounded-xl border overflow-hidden" />
      {error && (
        <div className="text-xs text-red-600">
          지도 로딩 실패: {error}
          <br />
          ClientID: <code>{cid || "(빈 값)"}</code>
        </div>
      )}
    </div>
  );
}
"@
Set-Content .\app\components\map\NaverMap.tsx $mapComp -Encoding UTF8
