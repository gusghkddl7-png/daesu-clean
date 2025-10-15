$loader = @"
"use client";

let _loading: Promise<typeof window.naver> | null = null;

export function loadNaverMaps(clientId: string): Promise<typeof window.naver> {
  if (typeof window === "undefined") throw new Error("window is undefined");
  if ((window as any).naver?.maps) return Promise.resolve((window as any).naver);

  if (!_loading) {
    _loading = new Promise((resolve, reject) => {
      const id = "naver-maps-sdk";
      const prev = document.getElementById(id) as HTMLScriptElement | null;
      if (prev) prev.remove();

      if (!clientId) {
        reject(new Error("NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID is empty"));
        return;
      }

      const s = document.createElement("script");
      s.id = id;
      s.src = \`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=\${encodeURIComponent(clientId)}\`;
      s.async = true;
      s.onload = () => {
        if ((window as any).naver?.maps) resolve((window as any).naver);
        else reject(new Error("Naver Maps loaded but window.naver.maps not found"));
      };
      s.onerror = () => reject(new Error("Failed to load Naver Maps SDK"));
      document.head.appendChild(s);
    });
  }
  return _loading;
}
"@
Set-Content .\app\components\map\useNaverLoader.ts $loader -Encoding UTF8
