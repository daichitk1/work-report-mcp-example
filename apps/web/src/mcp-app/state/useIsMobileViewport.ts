import { useEffect, useState } from "react";

import { WORK_REPORT_MOBILE_MEDIA_QUERY } from "../view/styles.js";

/** Mobile幅ではDetailをBottom Sheetへ切り替える。 */
export const useIsMobileViewport = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const query = window.matchMedia(WORK_REPORT_MOBILE_MEDIA_QUERY);
    setIsMobile(query.matches);

    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
};
