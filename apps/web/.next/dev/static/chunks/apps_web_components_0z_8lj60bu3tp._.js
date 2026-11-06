(()=>{"use strict";(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/components/DragCursor.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DragCursor",
    ()=>DragCursor,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function DragCursor() {
    _s();
    const cursorRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DragCursor.useEffect": ()=>{
            const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
            if (!isFinePointer) return;
            const cursor = cursorRef.current;
            if (!cursor) return;
            const track = document.querySelector('.steps__track');
            if (!track) return;
            let targetX = -100;
            let targetY = -100;
            let currentX = -100;
            let currentY = -100;
            let targetScale = 0;
            let currentScale = 0;
            let isInside = false;
            let rafId = null;
            const lerp = {
                "DragCursor.useEffect.lerp": (a, b, t)=>a + (b - a) * t
            }["DragCursor.useEffect.lerp"];
            const update = {
                "DragCursor.useEffect.update": ()=>{
                    currentX = lerp(currentX, targetX, 0.22);
                    currentY = lerp(currentY, targetY, 0.22);
                    currentScale = lerp(currentScale, targetScale, 0.2);
                    if (cursor) {
                        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${currentScale.toFixed(3)})`;
                    }
                    if (isInside || currentScale > 0.01) {
                        rafId = requestAnimationFrame(update);
                    } else {
                        rafId = null;
                    }
                }
            }["DragCursor.useEffect.update"];
            const startLoop = {
                "DragCursor.useEffect.startLoop": ()=>{
                    if (!rafId) {
                        rafId = requestAnimationFrame(update);
                    }
                }
            }["DragCursor.useEffect.startLoop"];
            const handlePointerEnter = {
                "DragCursor.useEffect.handlePointerEnter": (e)=>{
                    isInside = true;
                    targetScale = 1;
                    targetX = e.clientX;
                    targetY = e.clientY;
                    currentX = e.clientX;
                    currentY = e.clientY;
                    cursor.classList.add('is-visible');
                    startLoop();
                }
            }["DragCursor.useEffect.handlePointerEnter"];
            const handlePointerMove = {
                "DragCursor.useEffect.handlePointerMove": (e)=>{
                    targetX = e.clientX;
                    targetY = e.clientY;
                    startLoop();
                }
            }["DragCursor.useEffect.handlePointerMove"];
            const handlePointerLeave = {
                "DragCursor.useEffect.handlePointerLeave": ()=>{
                    isInside = false;
                    targetScale = 0;
                    cursor.classList.remove('is-visible', 'is-down');
                }
            }["DragCursor.useEffect.handlePointerLeave"];
            const handlePointerDown = {
                "DragCursor.useEffect.handlePointerDown": ()=>{
                    cursor.classList.add('is-down');
                }
            }["DragCursor.useEffect.handlePointerDown"];
            const handlePointerUp = {
                "DragCursor.useEffect.handlePointerUp": ()=>{
                    cursor.classList.remove('is-down');
                }
            }["DragCursor.useEffect.handlePointerUp"];
            track.addEventListener('pointerenter', handlePointerEnter);
            track.addEventListener('pointermove', handlePointerMove);
            track.addEventListener('pointerleave', handlePointerLeave);
            track.addEventListener('pointerdown', handlePointerDown);
            window.addEventListener('pointerup', handlePointerUp);
            window.addEventListener('pointercancel', handlePointerUp);
            return ({
                "DragCursor.useEffect": ()=>{
                    track.removeEventListener('pointerenter', handlePointerEnter);
                    track.removeEventListener('pointermove', handlePointerMove);
                    track.removeEventListener('pointerleave', handlePointerLeave);
                    track.removeEventListener('pointerdown', handlePointerDown);
                    window.removeEventListener('pointerup', handlePointerUp);
                    window.removeEventListener('pointercancel', handlePointerUp);
                    if (rafId) cancelAnimationFrame(rafId);
                }
            })["DragCursor.useEffect"];
        }
    }["DragCursor.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: cursorRef,
        className: "drag-cursor",
        "aria-hidden": "true",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            children: "Drag"
        }, void 0, false, {
            fileName: "[project]/apps/web/components/DragCursor.tsx",
            lineNumber: 102,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/components/DragCursor.tsx",
        lineNumber: 101,
        columnNumber: 5
    }, this);
}
_s(DragCursor, "BAOXNtFTrLv46f15Gc0vVLC8KO4=");
_c = DragCursor;
const __TURBOPACK__default__export__ = DragCursor;
var _c;
__turbopack_context__.k.register(_c, "DragCursor");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/SmoothScroll.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SmoothScroll",
    ()=>SmoothScroll,
    "default",
    ()=>__TURBOPACK__default__export__,
    "useLenisScroll",
    ()=>useLenisScroll
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lenis$2f$dist$2f$lenis$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lenis/dist/lenis.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/gsap/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/gsap/ScrollTrigger.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
if ("TURBOPACK compile-time truthy", 1) {
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].registerPlugin(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollTrigger"]);
}
const LenisContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
    getLenis: ()=>null,
    scrollTo: ()=>{}
});
const useLenisScroll = ()=>{
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(LenisContext);
};
_s(useLenisScroll, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
function SmoothScroll({ children }) {
    _s1();
    const lenisRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SmoothScroll.useEffect": ()=>{
            document.documentElement.classList.add('js');
            // Reveal on scroll
            const io = new IntersectionObserver({
                "SmoothScroll.useEffect": (entries)=>{
                    entries.forEach({
                        "SmoothScroll.useEffect": (en)=>{
                            if (!en.isIntersecting) return;
                            en.target.classList.add('is-in');
                            io.unobserve(en.target);
                        }
                    }["SmoothScroll.useEffect"]);
                }
            }["SmoothScroll.useEffect"], {
                threshold: 0.18,
                rootMargin: '0px 0px -6% 0px'
            });
            document.querySelectorAll('[data-reveal]').forEach({
                "SmoothScroll.useEffect": (el)=>io.observe(el)
            }["SmoothScroll.useEffect"]);
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollTrigger"].refresh();
                return ({
                    "SmoothScroll.useEffect": ()=>{
                        io.disconnect();
                    }
                })["SmoothScroll.useEffect"];
            }
            const lenis = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lenis$2f$dist$2f$lenis$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]({
                lerp: 0.1,
                smoothWheel: true
            });
            lenisRef.current = lenis;
            // Sync Lenis with GSAP ScrollTrigger
            lenis.on('scroll', __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollTrigger"].update);
            const updateTicker = {
                "SmoothScroll.useEffect.updateTicker": (time)=>{
                    lenis.raf(time * 1000);
                }
            }["SmoothScroll.useEffect.updateTicker"];
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].ticker.add(updateTicker);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].ticker.lagSmoothing(0);
            // Global anchor interception
            const handleAnchorClick = {
                "SmoothScroll.useEffect.handleAnchorClick": (e)=>{
                    const target = e.target.closest('a[href^="#"]');
                    if (!target) return;
                    const href = target.getAttribute('href');
                    if (!href || href === '#') return;
                    e.preventDefault();
                    const el = href === '#top' ? document.body : document.querySelector(href);
                    if (el) {
                        lenis.scrollTo(href === '#top' ? 0 : el, {
                            offset: -20
                        });
                    }
                }
            }["SmoothScroll.useEffect.handleAnchorClick"];
            document.addEventListener('click', handleAnchorClick);
            // Refresh ScrollTrigger after assets settle
            const refreshTimer = setTimeout({
                "SmoothScroll.useEffect.refreshTimer": ()=>{
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollTrigger"].refresh();
                }
            }["SmoothScroll.useEffect.refreshTimer"], 500);
            return ({
                "SmoothScroll.useEffect": ()=>{
                    clearTimeout(refreshTimer);
                    io.disconnect();
                    document.removeEventListener('click', handleAnchorClick);
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].ticker.remove(updateTicker);
                    lenis.destroy();
                    lenisRef.current = null;
                }
            })["SmoothScroll.useEffect"];
        }
    }["SmoothScroll.useEffect"], []);
    const contextValue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SmoothScroll.useMemo[contextValue]": ()=>({
                getLenis: ({
                    "SmoothScroll.useMemo[contextValue]": ()=>lenisRef.current
                })["SmoothScroll.useMemo[contextValue]"],
                scrollTo: ({
                    "SmoothScroll.useMemo[contextValue]": (target, options)=>{
                        if (lenisRef.current) {
                            lenisRef.current.scrollTo(target, options);
                        } else if (typeof target === 'string') {
                            const el = target === '#top' ? document.body : document.querySelector(target);
                            el?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }
                    }
                })["SmoothScroll.useMemo[contextValue]"]
            })
    }["SmoothScroll.useMemo[contextValue]"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LenisContext.Provider, {
        value: contextValue,
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/web/components/SmoothScroll.tsx",
        lineNumber: 115,
        columnNumber: 5
    }, this);
}
_s1(SmoothScroll, "vUKnS41Shycj+jR57mohaqeQWpo=");
_c = SmoothScroll;
const __TURBOPACK__default__export__ = SmoothScroll;
var _c;
__turbopack_context__.k.register(_c, "SmoothScroll");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/ThemeToggle.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeToggle",
    ()=>ThemeToggle,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function getThemeSnapshot() {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-theme') || 'light';
}
function subscribe(callback) {
    if (typeof document === 'undefined') return ()=>{};
    const observer = new MutationObserver((mutations)=>{
        for (const m of mutations){
            if (m.attributeName === 'data-theme') {
                callback();
            }
        }
    });
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [
            'data-theme'
        ]
    });
    return ()=>observer.disconnect();
}
function ThemeToggle() {
    _s();
    const theme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribe, getThemeSnapshot, {
        "ThemeToggle.useSyncExternalStore[theme]": ()=>'light'
    }["ThemeToggle.useSyncExternalStore[theme]"]);
    const toggleTheme = ()=>{
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        try {
            localStorage.setItem('kraft-theme', nextTheme);
        } catch  {}
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        className: "theme-toggle",
        type: "button",
        onClick: toggleTheme,
        "aria-label": theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                className: "theme-toggle__moon",
                "aria-hidden": "true",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                    href: "#i-moon"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/ThemeToggle.tsx",
                    lineNumber: 42,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/ThemeToggle.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                className: "theme-toggle__sun",
                "aria-hidden": "true",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                    href: "#i-sun"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/ThemeToggle.tsx",
                    lineNumber: 45,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/ThemeToggle.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/ThemeToggle.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
_s(ThemeToggle, "HbqBb6oWjpQSXathj5kEm7mskTM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"]
    ];
});
_c = ThemeToggle;
const __TURBOPACK__default__export__ = ThemeToggle;
var _c;
__turbopack_context__.k.register(_c, "ThemeToggle");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);})()

//# sourceMappingURL=apps_web_components_0z_8lj60bu3tp._.js.map