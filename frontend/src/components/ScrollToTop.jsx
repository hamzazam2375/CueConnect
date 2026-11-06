import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// a new page starts at the top; hash links (e.g. /#events) are left to the browser
export default function ScrollToTop() {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (!hash) window.scrollTo(0, 0);
    }, [pathname, hash]);

    return null;
}
