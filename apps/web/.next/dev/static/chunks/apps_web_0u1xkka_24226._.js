(()=>{"use strict";(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/components/StaggeredMenu.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StaggeredMenu",
    ()=>StaggeredMenu,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/gsap/index.js [app-client] (ecmascript) <locals>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const useIsomorphicLayoutEffect = ("TURBOPACK compile-time truthy", 1) ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLayoutEffect"] : "TURBOPACK unreachable";
const StaggeredMenu = ({ position = 'right', colors = [
    '#181230',
    '#2d1858',
    '#5b21b6'
], items = [], socialItems = [], displaySocials = true, displayItemNumbering = true, className, logoUrl = '/assets/img/amrs-logo.png', menuButtonColor = '#ffffff', openMenuButtonColor = '#ffffff', accentColor = '#a78bfa', changeMenuColorOnOpen = true, isFixed = true, closeOnClickAway = true, isOpen: controlledIsOpen, onMenuOpen, onMenuClose, onItemClick })=>{
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [active, setActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const openRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const panelRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const preLayersRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const preLayerElsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])([]);
    const plusHRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const plusVRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const iconRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const textInnerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [textLines, setTextLines] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([
        'Menu',
        'Close'
    ]);
    const openTlRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const closeTweenRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const spinTweenRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const textCycleAnimRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const colorTweenRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const toggleBtnRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const busyRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const itemEntranceTweenRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Initial layout & offscreen positioning
    useIsomorphicLayoutEffect({
        "StaggeredMenu.useIsomorphicLayoutEffect": ()=>{
            const ctx = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].context({
                "StaggeredMenu.useIsomorphicLayoutEffect.ctx": ()=>{
                    const panel = panelRef.current;
                    const preContainer = preLayersRef.current;
                    const plusH = plusHRef.current;
                    const plusV = plusVRef.current;
                    const icon = iconRef.current;
                    const textInner = textInnerRef.current;
                    if (!panel || !plusH || !plusV || !icon || !textInner) return;
                    let preLayers = [];
                    if (preContainer) {
                        preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
                    }
                    preLayerElsRef.current = preLayers;
                    const offscreen = position === 'left' ? -100 : 100;
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set([
                        panel,
                        ...preLayers
                    ], {
                        xPercent: offscreen,
                        opacity: 1
                    });
                    if (preContainer) {
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(preContainer, {
                            xPercent: 0,
                            opacity: 1
                        });
                    }
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(plusH, {
                        transformOrigin: '50% 50%',
                        rotate: 0
                    });
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(plusV, {
                        transformOrigin: '50% 50%',
                        rotate: 90
                    });
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(icon, {
                        rotate: 0,
                        transformOrigin: '50% 50%'
                    });
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(textInner, {
                        yPercent: 0
                    });
                    if (toggleBtnRef.current) __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(toggleBtnRef.current, {
                        color: menuButtonColor
                    });
                }
            }["StaggeredMenu.useIsomorphicLayoutEffect.ctx"]);
            return ({
                "StaggeredMenu.useIsomorphicLayoutEffect": ()=>ctx.revert()
            })["StaggeredMenu.useIsomorphicLayoutEffect"];
        }
    }["StaggeredMenu.useIsomorphicLayoutEffect"], [
        menuButtonColor,
        position
    ]);
    const buildOpenTimeline = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StaggeredMenu.useCallback[buildOpenTimeline]": ()=>{
            const panel = panelRef.current;
            const layers = preLayerElsRef.current;
            if (!panel) return null;
            openTlRef.current?.kill();
            if (closeTweenRef.current) {
                closeTweenRef.current.kill();
                closeTweenRef.current = null;
            }
            itemEntranceTweenRef.current?.kill();
            const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
            const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
            const socialTitle = panel.querySelector('.sm-socials-title');
            const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
            const offscreen = position === 'left' ? -100 : 100;
            const layerStates = layers.map({
                "StaggeredMenu.useCallback[buildOpenTimeline].layerStates": (el)=>({
                        el,
                        start: offscreen
                    })
            }["StaggeredMenu.useCallback[buildOpenTimeline].layerStates"]);
            const panelStart = offscreen;
            if (itemEls.length) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(itemEls, {
                    yPercent: 140,
                    rotate: 10
                });
            }
            if (numberEls.length) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(numberEls, {
                    '--sm-num-opacity': 0
                });
            }
            if (socialTitle) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(socialTitle, {
                    opacity: 0
                });
            }
            if (socialLinks.length) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(socialLinks, {
                    y: 25,
                    opacity: 0
                });
            }
            const tl = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].timeline({
                paused: true
            });
            layerStates.forEach({
                "StaggeredMenu.useCallback[buildOpenTimeline]": (ls, i)=>{
                    tl.fromTo(ls.el, {
                        xPercent: ls.start
                    }, {
                        xPercent: 0,
                        duration: 0.5,
                        ease: 'power4.out'
                    }, i * 0.07);
                }
            }["StaggeredMenu.useCallback[buildOpenTimeline]"]);
            const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
            const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
            const panelDuration = 0.65;
            tl.fromTo(panel, {
                xPercent: panelStart
            }, {
                xPercent: 0,
                duration: panelDuration,
                ease: 'power4.out'
            }, panelInsertTime);
            if (itemEls.length) {
                const itemsStartRatio = 0.15;
                const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
                tl.to(itemEls, {
                    yPercent: 0,
                    rotate: 0,
                    duration: 0.9,
                    ease: 'power4.out',
                    stagger: {
                        each: 0.08,
                        from: 'start'
                    }
                }, itemsStart);
                if (numberEls.length) {
                    tl.to(numberEls, {
                        duration: 0.6,
                        ease: 'power2.out',
                        '--sm-num-opacity': 1,
                        stagger: {
                            each: 0.07,
                            from: 'start'
                        }
                    }, itemsStart + 0.1);
                }
            }
            if (socialTitle || socialLinks.length) {
                const socialsStart = panelInsertTime + panelDuration * 0.4;
                if (socialTitle) {
                    tl.to(socialTitle, {
                        opacity: 1,
                        duration: 0.5,
                        ease: 'power2.out'
                    }, socialsStart);
                }
                if (socialLinks.length) {
                    tl.to(socialLinks, {
                        y: 0,
                        opacity: 1,
                        duration: 0.55,
                        ease: 'power3.out',
                        stagger: {
                            each: 0.08,
                            from: 'start'
                        },
                        onComplete: {
                            "StaggeredMenu.useCallback[buildOpenTimeline]": ()=>{
                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(socialLinks, {
                                    clearProps: 'opacity'
                                });
                            }
                        }["StaggeredMenu.useCallback[buildOpenTimeline]"]
                    }, socialsStart + 0.04);
                }
            }
            openTlRef.current = tl;
            return tl;
        }
    }["StaggeredMenu.useCallback[buildOpenTimeline]"], [
        position
    ]);
    const playOpen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StaggeredMenu.useCallback[playOpen]": ()=>{
            setActive(true);
            if (busyRef.current) return;
            busyRef.current = true;
            const tl = buildOpenTimeline();
            if (tl) {
                tl.eventCallback('onComplete', {
                    "StaggeredMenu.useCallback[playOpen]": ()=>{
                        busyRef.current = false;
                    }
                }["StaggeredMenu.useCallback[playOpen]"]);
                tl.play(0);
            } else {
                busyRef.current = false;
            }
        }
    }["StaggeredMenu.useCallback[playOpen]"], [
        buildOpenTimeline
    ]);
    const playClose = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StaggeredMenu.useCallback[playClose]": ()=>{
            openTlRef.current?.kill();
            openTlRef.current = null;
            itemEntranceTweenRef.current?.kill();
            const panel = panelRef.current;
            const layers = preLayerElsRef.current;
            if (!panel) return;
            const all = [
                ...layers,
                panel
            ];
            closeTweenRef.current?.kill();
            const offscreen = position === 'left' ? -100 : 100;
            closeTweenRef.current = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(all, {
                xPercent: offscreen,
                duration: 0.32,
                ease: 'power3.in',
                overwrite: 'auto',
                onComplete: {
                    "StaggeredMenu.useCallback[playClose]": ()=>{
                        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
                        if (itemEls.length) {
                            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(itemEls, {
                                yPercent: 140,
                                rotate: 10
                            });
                        }
                        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
                        if (numberEls.length) {
                            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(numberEls, {
                                '--sm-num-opacity': 0
                            });
                        }
                        const socialTitle = panel.querySelector('.sm-socials-title');
                        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
                        if (socialTitle) __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(socialTitle, {
                            opacity: 0
                        });
                        if (socialLinks.length) __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(socialLinks, {
                            y: 25,
                            opacity: 0
                        });
                        busyRef.current = false;
                        setActive(false);
                    }
                }["StaggeredMenu.useCallback[playClose]"]
            });
        }
    }["StaggeredMenu.useCallback[playClose]"], [
        position
    ]);
    const animateIcon = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StaggeredMenu.useCallback[animateIcon]": (opening)=>{
            const icon = iconRef.current;
            if (!icon) return;
            spinTweenRef.current?.kill();
            if (opening) {
                spinTweenRef.current = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(icon, {
                    rotate: 225,
                    duration: 0.8,
                    ease: 'power4.out',
                    overwrite: 'auto'
                });
            } else {
                spinTweenRef.current = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(icon, {
                    rotate: 0,
                    duration: 0.35,
                    ease: 'power3.inOut',
                    overwrite: 'auto'
                });
            }
        }
    }["StaggeredMenu.useCallback[animateIcon]"], []);
    const animateColor = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StaggeredMenu.useCallback[animateColor]": (opening)=>{
            const btn = toggleBtnRef.current;
            if (!btn) return;
            colorTweenRef.current?.kill();
            if (changeMenuColorOnOpen) {
                const targetColor = opening ? openMenuButtonColor : menuButtonColor;
                colorTweenRef.current = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(btn, {
                    color: targetColor,
                    delay: 0.18,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            } else {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(btn, {
                    color: menuButtonColor
                });
            }
        }
    }["StaggeredMenu.useCallback[animateColor]"], [
        openMenuButtonColor,
        menuButtonColor,
        changeMenuColorOnOpen
    ]);
    const animateText = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StaggeredMenu.useCallback[animateText]": (opening)=>{
            const inner = textInnerRef.current;
            if (!inner) return;
            textCycleAnimRef.current?.kill();
            const currentLabel = opening ? 'Menu' : 'Close';
            const targetLabel = opening ? 'Close' : 'Menu';
            const cycles = 3;
            const seq = [
                currentLabel
            ];
            let last = currentLabel;
            for(let i = 0; i < cycles; i++){
                last = last === 'Menu' ? 'Close' : 'Menu';
                seq.push(last);
            }
            if (last !== targetLabel) seq.push(targetLabel);
            seq.push(targetLabel);
            setTextLines(seq);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set(inner, {
                yPercent: 0
            });
            const lineCount = seq.length;
            const finalShift = (lineCount - 1) / lineCount * 100;
            textCycleAnimRef.current = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(inner, {
                yPercent: -finalShift,
                duration: 0.5 + lineCount * 0.07,
                ease: 'power4.out'
            });
        }
    }["StaggeredMenu.useCallback[animateText]"], []);
    const toggleMenu = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StaggeredMenu.useCallback[toggleMenu]": ()=>{
            const target = !openRef.current;
            openRef.current = target;
            setOpen(target);
            if (target) {
                onMenuOpen?.();
                playOpen();
            } else {
                onMenuClose?.();
                playClose();
            }
            animateIcon(target);
            animateColor(target);
            animateText(target);
        }
    }["StaggeredMenu.useCallback[toggleMenu]"], [
        playOpen,
        playClose,
        animateIcon,
        animateColor,
        animateText,
        onMenuOpen,
        onMenuClose
    ]);
    const closeMenu = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StaggeredMenu.useCallback[closeMenu]": ()=>{
            if (openRef.current) {
                openRef.current = false;
                setOpen(false);
                onMenuClose?.();
                playClose();
                animateIcon(false);
                animateColor(false);
                animateText(false);
            }
        }
    }["StaggeredMenu.useCallback[closeMenu]"], [
        playClose,
        animateIcon,
        animateColor,
        animateText,
        onMenuClose
    ]);
    const handleToggleClick = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StaggeredMenu.useCallback[handleToggleClick]": (e)=>{
            e.preventDefault();
            e.stopPropagation();
            if (openRef.current) {
                closeMenu();
            } else {
                toggleMenu();
            }
        }
    }["StaggeredMenu.useCallback[handleToggleClick]"], [
        closeMenu,
        toggleMenu
    ]);
    // Synchronize with external controlled prop (e.g. navbar hamburger)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StaggeredMenu.useEffect": ()=>{
            if (controlledIsOpen === undefined) return;
            if (controlledIsOpen !== openRef.current) {
                openRef.current = controlledIsOpen;
                setOpen(controlledIsOpen);
                if (controlledIsOpen) {
                    playOpen();
                } else {
                    playClose();
                }
                animateIcon(controlledIsOpen);
                animateColor(controlledIsOpen);
                animateText(controlledIsOpen);
            }
        }
    }["StaggeredMenu.useEffect"], [
        controlledIsOpen,
        playOpen,
        playClose,
        animateIcon,
        animateColor,
        animateText
    ]);
    // Lock scroll when open
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StaggeredMenu.useEffect": ()=>{
            if (open) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
            return ({
                "StaggeredMenu.useEffect": ()=>{
                    document.body.style.overflow = '';
                }
            })["StaggeredMenu.useEffect"];
        }
    }["StaggeredMenu.useEffect"], [
        open
    ]);
    // Keyboard Escape listener
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StaggeredMenu.useEffect": ()=>{
            const handleKeyDown = {
                "StaggeredMenu.useEffect.handleKeyDown": (e)=>{
                    if (e.key === 'Escape' && openRef.current) {
                        closeMenu();
                    }
                }
            }["StaggeredMenu.useEffect.handleKeyDown"];
            window.addEventListener('keydown', handleKeyDown);
            return ({
                "StaggeredMenu.useEffect": ()=>window.removeEventListener('keydown', handleKeyDown)
            })["StaggeredMenu.useEffect"];
        }
    }["StaggeredMenu.useEffect"], [
        closeMenu
    ]);
    // Click outside to close
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StaggeredMenu.useEffect": ()=>{
            if (!closeOnClickAway || !open) return;
            const handleClickOutside = {
                "StaggeredMenu.useEffect.handleClickOutside": (event)=>{
                    const target = event.target;
                    if (panelRef.current && !panelRef.current.contains(target) && toggleBtnRef.current && !toggleBtnRef.current.contains(target)) {
                        closeMenu();
                    }
                }
            }["StaggeredMenu.useEffect.handleClickOutside"];
            document.addEventListener('click', handleClickOutside);
            return ({
                "StaggeredMenu.useEffect": ()=>{
                    document.removeEventListener('click', handleClickOutside);
                }
            })["StaggeredMenu.useEffect"];
        }
    }["StaggeredMenu.useEffect"], [
        closeOnClickAway,
        open,
        closeMenu
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (className ? className + ' ' : '') + 'staggered-menu-wrapper' + (isFixed ? ' fixed-wrapper' : ''),
        style: accentColor ? {
            ['--sm-accent']: accentColor
        } : undefined,
        "data-position": position,
        "data-open": open || undefined,
        "data-active": active || undefined,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "staggered-menu-backdrop",
                onClick: closeMenu,
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                lineNumber: 462,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: preLayersRef,
                className: "sm-prelayers",
                "aria-hidden": "true",
                children: (()=>{
                    const raw = colors && colors.length ? colors.slice(0, 4) : [
                        '#181230',
                        '#2d1858',
                        '#5b21b6'
                    ];
                    const arr = [
                        ...raw
                    ];
                    if (arr.length >= 3) {
                        const mid = Math.floor(arr.length / 2);
                        arr.splice(mid, 1);
                    }
                    return arr.map((c, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "sm-prelayer",
                            style: {
                                background: c
                            }
                        }, i, false, {
                            fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                            lineNumber: 477,
                            columnNumber: 36
                        }, ("TURBOPACK compile-time value", void 0)));
                })()
            }, void 0, false, {
                fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                lineNumber: 469,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "staggered-menu-header",
                "aria-label": "Main navigation header",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    ref: toggleBtnRef,
                    className: "sm-toggle",
                    "aria-label": open ? 'Close menu' : 'Open menu',
                    "aria-expanded": open,
                    "aria-controls": "staggered-menu-panel",
                    onClick: handleToggleClick,
                    type: "button",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "sm-toggle-textWrap",
                            "aria-hidden": "true",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                ref: textInnerRef,
                                className: "sm-toggle-textInner",
                                children: textLines.map((l, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "sm-toggle-line",
                                        children: l
                                    }, i, false, {
                                        fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                        lineNumber: 495,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)))
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                lineNumber: 493,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                            lineNumber: 492,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            ref: iconRef,
                            className: "sm-icon",
                            "aria-hidden": "true",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    ref: plusHRef,
                                    className: "sm-icon-line"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                    lineNumber: 502,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    ref: plusVRef,
                                    className: "sm-icon-line"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                    lineNumber: 503,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                            lineNumber: 501,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                    lineNumber: 483,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                lineNumber: 482,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                id: "staggered-menu-panel",
                ref: panelRef,
                className: "staggered-menu-panel",
                "aria-hidden": !open,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "sm-panel-inner",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                            className: "sm-panel-list",
                            role: "list",
                            "data-numbering": displayItemNumbering || undefined,
                            children: items && items.length ? items.map((it, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    className: "sm-panel-itemWrap",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        className: "sm-panel-item",
                                        href: it.link,
                                        "aria-label": it.ariaLabel || it.label,
                                        "data-index": idx + 1,
                                        onClick: ()=>{
                                            onItemClick?.(it);
                                            closeMenu();
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "sm-panel-itemLabel",
                                            children: it.label
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                            lineNumber: 525,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                        lineNumber: 515,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, it.label + idx, false, {
                                    fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                    lineNumber: 514,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "sm-panel-itemWrap",
                                "aria-hidden": "true",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "sm-panel-item",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "sm-panel-itemLabel",
                                        children: "No items"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                        lineNumber: 532,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                    lineNumber: 531,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                lineNumber: 530,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                            lineNumber: 511,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        displaySocials && socialItems && socialItems.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "sm-socials",
                            "aria-label": "Social links",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "sm-socials-title",
                                    children: "Resources & Links"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                    lineNumber: 540,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "sm-socials-list",
                                    role: "list",
                                    children: socialItems.map((s, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            className: "sm-socials-item",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: s.link,
                                                target: s.link.startsWith('http') ? '_blank' : undefined,
                                                rel: s.link.startsWith('http') ? 'noopener noreferrer' : undefined,
                                                className: "sm-socials-link",
                                                children: s.label
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                                lineNumber: 544,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, s.label + i, false, {
                                            fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                            lineNumber: 543,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0)))
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                                    lineNumber: 541,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                            lineNumber: 539,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                    lineNumber: 510,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
                lineNumber: 509,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/StaggeredMenu.tsx",
        lineNumber: 450,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(StaggeredMenu, "6RYbyk8Z5zgM6fmbAnR9ynUVPIQ=", false, function() {
    return [
        useIsomorphicLayoutEffect
    ];
});
_c = StaggeredMenu;
const __TURBOPACK__default__export__ = StaggeredMenu;
var _c;
__turbopack_context__.k.register(_c, "StaggeredMenu");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/sections/Faq.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Faq
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/gsap/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/gsap/ScrollTrigger.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$faq$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/data/faq.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
if ("TURBOPACK compile-time truthy", 1) {
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].registerPlugin(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollTrigger"]);
}
function Faq() {
    _s();
    const [openId, setOpenId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('faq-1');
    const sectionRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const titleRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const listRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const toggle = (id)=>{
        setOpenId((curr)=>curr === id ? null : id);
        setTimeout(()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollTrigger"].refresh();
        }, 350);
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Faq.useEffect": ()=>{
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) return;
            const mm = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].matchMedia();
            mm.add('(min-width: 901px)', {
                "Faq.useEffect": ()=>{
                    const section = sectionRef.current;
                    const title = titleRef.current;
                    const list = listRef.current;
                    if (!section || !title || !list) return;
                    const getTravel = {
                        "Faq.useEffect.getTravel": ()=>{
                            const vh = window.innerHeight;
                            const listH = list.offsetHeight;
                            const titleH = title.offsetHeight;
                            // Target: align with the bottom of the questions list
                            const listBottomAlign = Math.max(0, listH - titleH);
                            // Safety viewport clamp: ensure the bottom of the title stays well inside the viewport
                            const pinnedTop = 80;
                            const maxViewportTravel = Math.max(0, vh - pinnedTop - titleH - 50);
                            return Math.min(listBottomAlign, maxViewportTravel);
                        }
                    }["Faq.useEffect.getTravel"];
                    const tl = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].timeline({
                        scrollTrigger: {
                            trigger: section,
                            start: 'top top+=80',
                            end: {
                                "Faq.useEffect.tl": ()=>`+=${getTravel() + 120}`
                            }["Faq.useEffect.tl"],
                            pin: true,
                            scrub: 0.5,
                            invalidateOnRefresh: true
                        }
                    });
                    tl.to(title, {
                        y: {
                            "Faq.useEffect": ()=>getTravel()
                        }["Faq.useEffect"],
                        ease: 'power1.out'
                    });
                    return ({
                        "Faq.useEffect": ()=>{
                            tl.kill();
                        }
                    })["Faq.useEffect"];
                }
            }["Faq.useEffect"]);
            return ({
                "Faq.useEffect": ()=>{
                    mm.revert();
                }
            })["Faq.useEffect"];
        }
    }["Faq.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        ref: sectionRef,
        className: "faq",
        id: "resources",
        "aria-labelledby": "faq-title",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "wrap faq__grid",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    ref: titleRef,
                    className: "h2 faq__title",
                    id: "faq-title",
                    children: "Everything You Need to Know About AMRS."
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Faq.tsx",
                    lineNumber: 81,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    ref: listRef,
                    className: "faq__list",
                    "data-stagger": true,
                    children: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$faq$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["faqData"].map((item, idx)=>{
                        const isOpen = openId === item.id;
                        const btnId = `faq-b${idx + 1}`;
                        const panelId = `faq-p${idx + 1}`;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "faq__item",
                            "data-open": isOpen ? 'true' : 'false',
                            "data-reveal": true,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    id: btnId,
                                    "aria-expanded": isOpen,
                                    "aria-controls": panelId,
                                    onClick: ()=>toggle(item.id),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: item.question
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Faq.tsx",
                                            lineNumber: 105,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            "aria-hidden": "true",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                                href: "#i-plus"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/components/sections/Faq.tsx",
                                                lineNumber: 107,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Faq.tsx",
                                            lineNumber: 106,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/components/sections/Faq.tsx",
                                    lineNumber: 98,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "faq__panel",
                                    id: panelId,
                                    role: "region",
                                    "aria-labelledby": btnId,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: item.answer
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Faq.tsx",
                                            lineNumber: 117,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/components/sections/Faq.tsx",
                                        lineNumber: 116,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Faq.tsx",
                                    lineNumber: 110,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, item.id, true, {
                            fileName: "[project]/apps/web/components/sections/Faq.tsx",
                            lineNumber: 92,
                            columnNumber: 15
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Faq.tsx",
                    lineNumber: 85,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/components/sections/Faq.tsx",
            lineNumber: 80,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/components/sections/Faq.tsx",
        lineNumber: 79,
        columnNumber: 5
    }, this);
}
_s(Faq, "NuRR3MiYxUc4R0JOonBd41vHdSY=");
_c = Faq;
var _c;
__turbopack_context__.k.register(_c, "Faq");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/sections/Gallery.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Gallery",
    ()=>Gallery,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/image-component.js [app-client] (ecmascript) <export Image as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$gallery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/data/gallery.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function Gallery() {
    _s();
    const galleryRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const rowRefs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Gallery.useEffect": ()=>{
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) return;
            const clamp = {
                "Gallery.useEffect.clamp": (v, a, b)=>Math.min(b, Math.max(a, v))
            }["Gallery.useEffect.clamp"];
            const lerp = {
                "Gallery.useEffect.lerp": (a, b, t)=>a + (b - a) * t
            }["Gallery.useEffect.lerp"];
            const easeOut = {
                "Gallery.useEffect.easeOut": (t)=>1 - (1 - t) * (1 - t)
            }["Gallery.useEffect.easeOut"];
            const updateRows = {
                "Gallery.useEffect.updateRows": ()=>{
                    const vh = window.innerHeight;
                    rowRefs.current.forEach({
                        "Gallery.useEffect.updateRows": (row)=>{
                            if (!row) return;
                            const r = row.getBoundingClientRect();
                            if (r.bottom < -vh * 0.6 || r.top > vh * 1.6) return;
                            // Offset from center of viewport in vh units
                            const u = (r.top + r.height / 2 - vh / 2) / vh;
                            let gap = 98;
                            let side = 450;
                            let scale = 1;
                            let blur = 0;
                            let op = 1;
                            if (u >= 0) {
                                // Below center
                                const q = easeOut(clamp(u / 0.45, 0, 1));
                                const f = clamp((u - 0.12) / 0.4, 0, 1);
                                gap = lerp(98, 265, q);
                                side = 450;
                                scale = lerp(1, 0.87, q);
                                blur = f * 10;
                                op = 1 - f * 0.5;
                            } else {
                                // Above center
                                const q = easeOut(clamp(-u / 0.4, 0, 1));
                                const f = clamp((-u - 0.5) / 0.3, 0, 1);
                                gap = lerp(98, 24, q);
                                side = lerp(450, 300, q);
                                scale = 1;
                                blur = f * 6;
                                op = 1 - f * 0.35;
                            }
                            row.style.setProperty('--gap', gap.toFixed(1));
                            row.style.setProperty('--side', side.toFixed(1));
                            row.style.setProperty('--scale', scale.toFixed(3));
                            row.style.setProperty('--blur', `${blur.toFixed(1)}px`);
                            row.style.setProperty('--op', op.toFixed(2));
                        }
                    }["Gallery.useEffect.updateRows"]);
                }
            }["Gallery.useEffect.updateRows"];
            window.addEventListener('scroll', updateRows, {
                passive: true
            });
            window.addEventListener('resize', updateRows);
            updateRows();
            return ({
                "Gallery.useEffect": ()=>{
                    window.removeEventListener('scroll', updateRows);
                    window.removeEventListener('resize', updateRows);
                }
            })["Gallery.useEffect"];
        }
    }["Gallery.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        ref: galleryRef,
        className: "gallery",
        "aria-label": "Designs generated with Kraft",
        children: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$gallery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["galleryRows"].map((row, rowIndex)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: (el)=>{
                    rowRefs.current[rowIndex] = el;
                },
                className: "g-row",
                children: row.map((img, imgIndex)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__["default"], {
                        className: `g-img ${img.isTall ? 'g-img--tall' : ''}`,
                        src: img.src,
                        alt: img.alt,
                        width: img.width,
                        height: img.height
                    }, imgIndex, false, {
                        fileName: "[project]/apps/web/components/sections/Gallery.tsx",
                        lineNumber: 85,
                        columnNumber: 13
                    }, this))
            }, rowIndex, false, {
                fileName: "[project]/apps/web/components/sections/Gallery.tsx",
                lineNumber: 77,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/apps/web/components/sections/Gallery.tsx",
        lineNumber: 75,
        columnNumber: 5
    }, this);
}
_s(Gallery, "d/fMVevIndZtvWGhGmmzQEXL25Y=");
_c = Gallery;
const __TURBOPACK__default__export__ = Gallery;
var _c;
__turbopack_context__.k.register(_c, "Gallery");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/sections/Hero.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Hero",
    ()=>Hero,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function Hero() {
    _s();
    const heroRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const blobDarkRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const blobVioletRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const blobIndigoRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [promptValue, setPromptValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [uploadedFile, setUploadedFile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isBusy, setIsBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [activeTags, setActiveTags] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([
        'Diagnose',
        'Recover'
    ]);
    const [caption, setCaption] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('Supports PyTorch models · Intelligent diagnosis · Verified recovery');
    const toggleTag = (tag)=>{
        setActiveTags((prev)=>prev.includes(tag) ? prev.filter((t)=>t !== tag) : [
                ...prev,
                tag
            ]);
    };
    // Blob pointer drift animation (faithful port of main.js lines 70-129)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Hero.useEffect": ()=>{
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) return;
            const hero = heroRef.current;
            const darkEl = blobDarkRef.current;
            const violetEl = blobVioletRef.current;
            const indigoEl = blobIndigoRef.current;
            if (!hero || !darkEl || !violetEl || !indigoEl) return;
            let W = hero.offsetWidth;
            let H = hero.offsetHeight;
            const state = {
                dark: {
                    x: W * 0.58,
                    y: H * 0.5
                },
                violet: {
                    x: W * 0.7,
                    y: H * 0.72
                },
                indigo: {
                    x: W * 0.2,
                    y: H * 0.55
                }
            };
            const pointer = {
                x: 0,
                y: 0,
                active: false,
                last: 0
            };
            let isVisible = true;
            let rafId;
            const lerp = {
                "Hero.useEffect.lerp": (a, b, t)=>a + (b - a) * t
            }["Hero.useEffect.lerp"];
            const resizeObserver = new ResizeObserver({
                "Hero.useEffect": ()=>{
                    if (!hero) return;
                    W = hero.offsetWidth;
                    H = hero.offsetHeight;
                }
            }["Hero.useEffect"]);
            resizeObserver.observe(hero);
            const intersectionObserver = new IntersectionObserver({
                "Hero.useEffect": (entries)=>{
                    isVisible = entries[0].isIntersecting;
                }
            }["Hero.useEffect"], {
                threshold: 0
            });
            intersectionObserver.observe(hero);
            const onPointerMove = {
                "Hero.useEffect.onPointerMove": (e)=>{
                    const rect = hero.getBoundingClientRect();
                    pointer.x = e.clientX - rect.left;
                    pointer.y = e.clientY - rect.top;
                    pointer.active = true;
                    pointer.last = performance.now();
                }
            }["Hero.useEffect.onPointerMove"];
            const onPointerLeave = {
                "Hero.useEffect.onPointerLeave": ()=>{
                    pointer.active = false;
                }
            }["Hero.useEffect.onPointerLeave"];
            hero.addEventListener('pointermove', onPointerMove);
            hero.addEventListener('pointerleave', onPointerLeave);
            const tick = {
                "Hero.useEffect.tick": (t)=>{
                    if (isVisible) {
                        const follow = pointer.active && t - pointer.last < 2500;
                        const mix = follow ? 0.7 : 0;
                        // Dark blob
                        const darkTargetX = lerp(W * 0.56 + Math.sin(t * 0.00042) * W * 0.2, pointer.x, mix);
                        const darkTargetY = lerp(H * 0.5 + Math.cos(t * 0.00033) * H * 0.16, pointer.y, mix);
                        state.dark.x = lerp(state.dark.x, darkTargetX, 0.035);
                        state.dark.y = lerp(state.dark.y, darkTargetY, 0.035);
                        const darkRot = t * 0.006;
                        const darkSx = 1 + 0.2 * Math.sin(t * 0.0007);
                        const darkSy = 1 + 0.2 * Math.cos(t * 0.0006);
                        darkEl.style.transform = `translate3d(${state.dark.x - darkEl.offsetWidth / 2}px, ${state.dark.y - darkEl.offsetHeight / 2}px, 0) rotate(${darkRot}deg) scale(${darkSx}, ${darkSy})`;
                        // Violet blob
                        const violetTargetX = lerp(W * 0.68 + Math.cos(t * 0.00031) * W * 0.18, pointer.x + W * 0.08, mix * 0.55);
                        const violetTargetY = lerp(H * 0.7 + Math.sin(t * 0.00046) * H * 0.12, pointer.y + H * 0.14, mix * 0.55);
                        state.violet.x = lerp(state.violet.x, violetTargetX, 0.0245);
                        state.violet.y = lerp(state.violet.y, violetTargetY, 0.0245);
                        const violetRot = -t * 0.004;
                        const violetSx = 1 + 0.15 * Math.cos(t * 0.0005);
                        const violetSy = 1 + 0.15 * Math.sin(t * 0.0008);
                        violetEl.style.transform = `translate3d(${state.violet.x - violetEl.offsetWidth / 2}px, ${state.violet.y - violetEl.offsetHeight / 2}px, 0) rotate(${violetRot}deg) scale(${violetSx}, ${violetSy})`;
                        // Indigo blob
                        const indigoTargetX = lerp(W * 0.22 + Math.sin(t * 0.00025) * W * 0.14, pointer.x - W * 0.12, mix * 0.35);
                        const indigoTargetY = lerp(H * 0.56 + Math.cos(t * 0.00029) * H * 0.1, pointer.y + H * 0.05, mix * 0.35);
                        state.indigo.x = lerp(state.indigo.x, indigoTargetX, 0.0175);
                        state.indigo.y = lerp(state.indigo.y, indigoTargetY, 0.0175);
                        const indigoSx = 1 + 0.1 * Math.sin(t * 0.0004);
                        indigoEl.style.transform = `translate3d(${state.indigo.x - indigoEl.offsetWidth / 2}px, ${state.indigo.y - indigoEl.offsetHeight / 2}px, 0) scale(${indigoSx}, 1)`;
                    }
                    rafId = requestAnimationFrame(tick);
                }
            }["Hero.useEffect.tick"];
            rafId = requestAnimationFrame(tick);
            return ({
                "Hero.useEffect": ()=>{
                    cancelAnimationFrame(rafId);
                    resizeObserver.disconnect();
                    intersectionObserver.disconnect();
                    hero.removeEventListener('pointermove', onPointerMove);
                    hero.removeEventListener('pointerleave', onPointerLeave);
                }
            })["Hero.useEffect"];
        }
    }["Hero.useEffect"], []);
    const handleFileChange = (e)=>{
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file.name);
            setCaption(`Uploaded ${file.name} · Ready for diagnosis`);
        }
    };
    const handleSubmit = (e)=>{
        e.preventDefault();
        if (isBusy) return;
        setIsBusy(true);
        setCaption('AMRS is diagnosing model failure mode…');
        setTimeout(()=>{
            setCaption('Testing candidate strategies: Checkpoint Averaging + L2-SP…');
            setTimeout(()=>{
                setIsBusy(false);
                setPromptValue('');
                setCaption('Holdout verification passed: +4.8% accuracy gain (0 regression)');
                setTimeout(()=>{
                    setCaption('Supports PyTorch models · Intelligent diagnosis · Verified recovery');
                }, 3200);
            }, 1600);
        }, 1400);
    };
    const handleKeyDown = (e)=>{
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        ref: heroRef,
        className: "hero",
        id: "top",
        "aria-labelledby": "hero-title",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hero__bg",
                "aria-hidden": "true",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: blobIndigoRef,
                        className: "blob blob--indigo"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                        lineNumber: 176,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: blobDarkRef,
                        className: "blob blob--dark"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                        lineNumber: 177,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: blobVioletRef,
                        className: "blob blob--violet"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                        lineNumber: 178,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                lineNumber: 175,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hero__col",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "hero__title",
                        id: "hero-title",
                        "data-in": true,
                        style: {
                            '--i': 2
                        },
                        children: [
                            "Your AI Models Deserve a",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                lineNumber: 183,
                                columnNumber: 35
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                                children: "Second Chance."
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                lineNumber: 184,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                        lineNumber: 182,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hero__actions",
                        "data-in": true,
                        style: {
                            '--i': 3
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "#prompt-form",
                                className: "hero__btn-primary",
                                children: "Start Recovering →"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                lineNumber: 188,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "#features",
                                className: "hero__btn-secondary",
                                children: "Explore AMRS"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                lineNumber: 191,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                        lineNumber: 187,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                        className: `prompt ${isBusy ? 'is-busy' : ''}`,
                        id: "prompt-form",
                        onSubmit: handleSubmit,
                        "data-in": true,
                        style: {
                            '--i': 4
                        },
                        noValidate: true,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "sr-only",
                                htmlFor: "prompt",
                                children: "Describe your model's performance issue or upload a trained model..."
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                lineNumber: 204,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                id: "prompt",
                                name: "prompt",
                                rows: 2,
                                placeholder: "Describe your model's performance issue or upload a trained model...",
                                autoComplete: "off",
                                value: promptValue,
                                onChange: (e)=>setPromptValue(e.target.value),
                                onKeyDown: handleKeyDown
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                lineNumber: 207,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "file",
                                ref: fileInputRef,
                                accept: ".pt,.pth",
                                className: "sr-only",
                                onChange: handleFileChange,
                                id: "hero-file-upload"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                lineNumber: 218,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "prompt__bar",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "prompt__left",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "pill",
                                                type: "button",
                                                "aria-label": "Upload Model",
                                                onClick: ()=>fileInputRef.current?.click(),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                        "aria-hidden": "true",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                                            href: "#i-clip"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                            lineNumber: 236,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 235,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: uploadedFile ? uploadedFile : 'Upload Model'
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 238,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                lineNumber: 229,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "pill",
                                                type: "button",
                                                "aria-pressed": activeTags.includes('Diagnose'),
                                                onClick: ()=>toggleTag('Diagnose'),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                        "aria-hidden": "true",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                                            href: "#i-bulb"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                            lineNumber: 248,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 247,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Diagnose"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 250,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                lineNumber: 241,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "pill",
                                                type: "button",
                                                "aria-pressed": activeTags.includes('Recover'),
                                                onClick: ()=>toggleTag('Recover'),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                        "aria-hidden": "true",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                                            href: "#i-pen"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                            lineNumber: 260,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 259,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Recover"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 262,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                lineNumber: 253,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "pill",
                                                type: "button",
                                                "aria-pressed": activeTags.includes('Optimize'),
                                                onClick: ()=>toggleTag('Optimize'),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                        "aria-hidden": "true",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                                            href: "#i-sparkle"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                            lineNumber: 272,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 271,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Optimize"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 274,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                lineNumber: 265,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "pill",
                                                type: "button",
                                                "aria-pressed": activeTags.includes('Verify'),
                                                onClick: ()=>toggleTag('Verify'),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                        "aria-hidden": "true",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                                            href: "#i-check"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                            lineNumber: 284,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 283,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Verify"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 286,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                lineNumber: 277,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                        lineNumber: 228,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "prompt__right",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            className: "action-btn",
                                            type: "submit",
                                            "aria-label": "Analyze Model",
                                            disabled: isBusy,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Analyze Model"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                    lineNumber: 297,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    "aria-hidden": "true",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                                        href: "#i-arrow-right"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                        lineNumber: 299,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                                    lineNumber: 298,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                            lineNumber: 291,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                        lineNumber: 290,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                                lineNumber: 227,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                        lineNumber: 196,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "hero__caption",
                        id: "prompt-caption",
                        "data-in": true,
                        style: {
                            '--i': 5
                        },
                        children: caption
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                        lineNumber: 306,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                lineNumber: 181,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hero__foot",
                "data-in": true,
                style: {
                    '--i': 6
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                    className: "scroll-cue",
                    href: "#statement",
                    "aria-label": "Scroll down",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        "aria-hidden": "true",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                            href: "#i-arrow-down"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/sections/Hero.tsx",
                            lineNumber: 314,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/sections/Hero.tsx",
                        lineNumber: 313,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Hero.tsx",
                    lineNumber: 312,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/sections/Hero.tsx",
                lineNumber: 311,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/sections/Hero.tsx",
        lineNumber: 174,
        columnNumber: 5
    }, this);
}
_s(Hero, "2FoCCKsG+7JF2ltCWTBTJGcfLVg=");
_c = Hero;
const __TURBOPACK__default__export__ = Hero;
var _c;
__turbopack_context__.k.register(_c, "Hero");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/sections/Logos.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Logos",
    ()=>Logos,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$logos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/data/logos.ts [app-client] (ecmascript)");
'use client';
;
;
function Logos() {
    // Duplicate array to achieve an endless seamless loop in the horizontal strip
    const repeatedLogos = [
        ...__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$logos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logosData"],
        ...__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$logos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logosData"]
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "logos",
        id: "technologies",
        "aria-labelledby": "logos-title",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "wrap wrap--logos",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "logos__header",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "h2 logos__title",
                            id: "logos-title",
                            "data-reveal": true,
                            "data-heading": true,
                            children: "Built on the Technologies Powering Modern Machine Learning."
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/sections/Logos.tsx",
                            lineNumber: 14,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "logos__lead lead",
                            "data-reveal": true,
                            children: "An extensible recovery framework built for reproducible machine learning experimentation."
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/sections/Logos.tsx",
                            lineNumber: 17,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/sections/Logos.tsx",
                    lineNumber: 13,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/sections/Logos.tsx",
                lineNumber: 12,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "logos__strip-wrap",
                "data-reveal": true,
                role: "region",
                "aria-label": "Technologies powered by modern machine learning",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "logos__marquee",
                    "aria-hidden": "false",
                    children: repeatedLogos.map((logo, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            className: "logo-pill group",
                            href: logo.href,
                            target: "_blank",
                            rel: "noopener noreferrer",
                            "aria-label": logo.name,
                            tabIndex: index >= __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$logos$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logosData"].length ? -1 : 0,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    className: "logo-pill__icon",
                                    "aria-hidden": "true",
                                    style: {
                                        color: logo.color
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                        href: `#${logo.iconId}`
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/components/sections/Logos.tsx",
                                        lineNumber: 46,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Logos.tsx",
                                    lineNumber: 41,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "logo-pill__name",
                                    children: logo.name
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Logos.tsx",
                                    lineNumber: 48,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, `${logo.id}-${index}`, true, {
                            fileName: "[project]/apps/web/components/sections/Logos.tsx",
                            lineNumber: 32,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Logos.tsx",
                    lineNumber: 30,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/sections/Logos.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/sections/Logos.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
_c = Logos;
const __TURBOPACK__default__export__ = Logos;
var _c;
__turbopack_context__.k.register(_c, "Logos");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/sections/Nav.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Nav",
    ()=>Nav,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/image-component.js [app-client] (ecmascript) <export Image as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$StaggeredMenu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/StaggeredMenu.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const menuItems = [
    {
        label: 'Features',
        ariaLabel: '4-step model recovery workflow',
        link: '#features'
    },
    {
        label: 'Strategies',
        ariaLabel: '6 model recovery strategies',
        link: '#templates'
    },
    {
        label: 'Benchmarks',
        ariaLabel: 'Performance metrics and evaluation',
        link: '#performance'
    },
    {
        label: 'Experiments',
        ariaLabel: 'Reproducible failure recovery experiments',
        link: '#experiments'
    },
    {
        label: 'FAQ',
        ariaLabel: 'Everything you need to know about AMRS',
        link: '#faq'
    },
    {
        label: 'Diagnose',
        ariaLabel: 'Interactive model failure diagnosis',
        link: '#prompt-form'
    },
    {
        label: 'Get Started',
        ariaLabel: 'Sign up or log in to AMRS',
        link: '/get-started'
    }
];
const socialItems = [
    {
        label: 'GitHub',
        link: 'https://github.com/Manthan-Railkar/AMRS'
    },
    {
        label: 'PyTorch',
        link: 'https://pytorch.org'
    },
    {
        label: 'FastAPI',
        link: 'https://fastapi.tiangolo.com'
    }
];
function Nav() {
    _s();
    const [isOpen, setIsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [scrolled, setScrolled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Nav.useEffect": ()=>{
            const handleScroll = {
                "Nav.useEffect.handleScroll": ()=>{
                    setScrolled(window.scrollY > 20);
                }
            }["Nav.useEffect.handleScroll"];
            window.addEventListener('scroll', handleScroll, {
                passive: true
            });
            handleScroll();
            return ({
                "Nav.useEffect": ()=>window.removeEventListener('scroll', handleScroll)
            })["Nav.useEffect"];
        }
    }["Nav.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Nav.useEffect": ()=>{
            const handleKeyDown = {
                "Nav.useEffect.handleKeyDown": (e)=>{
                    if (e.key === 'Escape' && isOpen) {
                        setIsOpen(false);
                    }
                }
            }["Nav.useEffect.handleKeyDown"];
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
            window.addEventListener('keydown', handleKeyDown);
            return ({
                "Nav.useEffect": ()=>{
                    window.removeEventListener('keydown', handleKeyDown);
                    document.body.style.overflow = '';
                }
            })["Nav.useEffect"];
        }
    }["Nav.useEffect"], [
        isOpen
    ]);
    const handleLinkClick = ()=>{
        setIsOpen(false);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `nav-wrapper fixed top-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-none ${scrolled ? 'is-scrolled pt-2.5 sm:pt-3' : 'pt-4 sm:pt-5'}`,
                style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    paddingTop: scrolled ? '12px' : '18px',
                    paddingBottom: '8px',
                    pointerEvents: 'none',
                    transition: 'padding 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                    className: `nav mx-auto flex items-center justify-between rounded-full border text-white transition-all duration-300 pointer-events-auto ${scrolled ? 'bg-[#0a0814]/85 border-white/15 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl' : 'bg-transparent border-transparent shadow-none backdrop-blur-none'}`,
                    id: "top",
                    style: {
                        pointerEvents: 'auto',
                        width: 'min(1140px, calc(100% - 32px))',
                        marginInline: 'auto',
                        height: '52px',
                        padding: '0 8px 0 20px',
                        borderRadius: '9999px',
                        backgroundColor: scrolled ? 'rgba(10, 8, 20, 0.85)' : 'transparent',
                        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
                        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
                        border: scrolled ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                        boxShadow: scrolled ? '0 16px 40px -10px rgba(0, 0, 0, 0.7)' : 'none',
                        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#ffffff'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            className: "nav__brand flex items-center text-white no-underline shrink-0 group",
                            href: "#top",
                            "aria-label": "AMRS — Adaptive Model Recovery System",
                            style: {
                                display: 'inline-flex',
                                alignItems: 'center',
                                textDecoration: 'none',
                                color: '#ffffff',
                                flexShrink: 0
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__["default"], {
                                src: "/assets/img/amrs-logo.png",
                                alt: "AMRS",
                                width: 95,
                                height: 33,
                                priority: true,
                                className: "nav__brand-logo h-7 sm:h-[30px] w-auto object-contain transition-opacity duration-200 group-hover:opacity-90",
                                style: {
                                    height: '28px',
                                    width: 'auto',
                                    display: 'block'
                                }
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                lineNumber: 118,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/sections/Nav.tsx",
                            lineNumber: 106,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                            className: "nav__links hidden md:flex items-center gap-7 lg:gap-8 text-[12px] font-semibold uppercase tracking-[0.1em]",
                            "aria-label": "Primary",
                            style: {
                                alignItems: 'center',
                                textTransform: 'uppercase',
                                fontSize: '12px',
                                fontWeight: 600,
                                letterSpacing: '0.1em'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "#features",
                                    className: "text-white/70 hover:text-white transition-colors duration-200",
                                    style: {
                                        color: 'rgba(255, 255, 255, 0.72)',
                                        textDecoration: 'none',
                                        transition: 'color 0.2s'
                                    },
                                    children: "Features"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                    lineNumber: 145,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "#templates",
                                    className: "text-white/70 hover:text-white transition-colors duration-200",
                                    style: {
                                        color: 'rgba(255, 255, 255, 0.72)',
                                        textDecoration: 'none',
                                        transition: 'color 0.2s'
                                    },
                                    children: "Templates"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                    lineNumber: 152,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "#experiments",
                                    className: "text-white/70 hover:text-white transition-colors duration-200",
                                    style: {
                                        color: 'rgba(255, 255, 255, 0.72)',
                                        textDecoration: 'none',
                                        transition: 'color 0.2s'
                                    },
                                    children: "Experiments"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                    lineNumber: 159,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "#resources",
                                    className: "text-white/70 hover:text-white transition-colors duration-200",
                                    style: {
                                        color: 'rgba(255, 255, 255, 0.72)',
                                        textDecoration: 'none',
                                        transition: 'color 0.2s'
                                    },
                                    children: "Resources"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                    lineNumber: 166,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/components/sections/Nav.tsx",
                            lineNumber: 134,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "nav__right flex items-center gap-3 sm:gap-4 shrink-0",
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                flexShrink: 0
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "#prompt",
                                    className: "nav__action-link hidden sm:inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-white/75 hover:text-white transition-colors duration-200",
                                    style: {
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(255, 255, 255, 0.75)',
                                        textDecoration: 'none'
                                    },
                                    children: "Diagnose"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                    lineNumber: 185,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "/get-started",
                                    className: "nav__cta-btn inline-flex items-center gap-1.5 bg-white text-[#0b0914] hover:bg-neutral-100 hover:scale-[1.03] active:scale-[0.98] font-bold text-[12px] uppercase tracking-wider px-4 sm:px-5 py-2 rounded-full transition-all duration-200 shadow-[0_2px_12px_rgba(255,255,255,0.2)]",
                                    style: {
                                        height: '38px',
                                        padding: '0 18px',
                                        borderRadius: '9999px',
                                        backgroundColor: '#ffffff',
                                        color: '#0b0914',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        textDecoration: 'none',
                                        boxShadow: '0 4px 14px -2px rgba(255, 255, 255, 0.25)',
                                        whiteSpace: 'nowrap'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Get Started"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                            lineNumber: 220,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            width: "11",
                                            height: "11",
                                            viewBox: "0 0 12 12",
                                            fill: "none",
                                            xmlns: "http://www.w3.org/2000/svg",
                                            "aria-hidden": "true",
                                            style: {
                                                width: '11px',
                                                height: '11px',
                                                minWidth: '11px',
                                                minHeight: '11px',
                                                display: 'inline-block'
                                            },
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: "M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8",
                                                stroke: "currentColor",
                                                strokeWidth: "1.8",
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                                lineNumber: 236,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                            lineNumber: 221,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                    lineNumber: 199,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "menu-btn md:hidden w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors",
                                    type: "button",
                                    "aria-expanded": isOpen,
                                    "aria-controls": "staggered-menu-panel",
                                    onClick: ()=>setIsOpen((prev)=>!prev),
                                    "aria-label": isOpen ? 'Close menu' : 'Open menu',
                                    style: {
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        display: 'none',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: '#ffffff',
                                        cursor: 'pointer'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            width: "18",
                                            height: "18",
                                            viewBox: "0 0 24 24",
                                            "aria-hidden": "true",
                                            style: {
                                                width: '18px',
                                                height: '18px'
                                            },
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                                href: "#i-menu"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                                lineNumber: 273,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                            lineNumber: 266,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "sr-only",
                                            children: "Toggle menu"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                            lineNumber: 275,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/components/sections/Nav.tsx",
                                    lineNumber: 246,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/components/sections/Nav.tsx",
                            lineNumber: 176,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/sections/Nav.tsx",
                    lineNumber: 79,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/sections/Nav.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$StaggeredMenu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                isOpen: isOpen,
                onMenuOpen: ()=>setIsOpen(true),
                onMenuClose: ()=>setIsOpen(false),
                items: menuItems,
                socialItems: socialItems,
                displaySocials: true,
                displayItemNumbering: true,
                accentColor: "#a78bfa",
                colors: [
                    '#181230',
                    '#2d1858',
                    '#5b21b6'
                ],
                position: "right",
                isFixed: true
            }, void 0, false, {
                fileName: "[project]/apps/web/components/sections/Nav.tsx",
                lineNumber: 281,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/sections/Nav.tsx",
        lineNumber: 62,
        columnNumber: 5
    }, this);
}
_s(Nav, "QvXge5InenJxnKBGF8yFZH0QPpw=");
_c = Nav;
const __TURBOPACK__default__export__ = Nav;
var _c;
__turbopack_context__.k.register(_c, "Nav");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/sections/Performance.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Performance",
    ()=>Performance,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$charts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/data/charts.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function Performance() {
    _s();
    const groupRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [animatedValues, setAnimatedValues] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [isInView, setIsInView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Performance.useEffect": ()=>{
            const el = groupRef.current;
            if (!el) return;
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            // Calculate max values per category and set --p
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$charts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["performanceData"].forEach({
                "Performance.useEffect": (category)=>{
                    const maxVal = Math.max(...category.bars.map({
                        "Performance.useEffect.maxVal": (b)=>b.value
                    }["Performance.useEffect.maxVal"]));
                    category.bars.forEach({
                        "Performance.useEffect": (bar)=>{
                            const key = `${category.title}-${bar.label}`;
                            const p = bar.value / maxVal;
                            const domBar = el.querySelector(`[data-key="${key}"]`);
                            if (domBar) {
                                domBar.style.setProperty('--p', p.toString());
                            }
                        }
                    }["Performance.useEffect"]);
                }
            }["Performance.useEffect"]);
            const easeOut = {
                "Performance.useEffect.easeOut": (t)=>1 - (1 - t) * (1 - t)
            }["Performance.useEffect.easeOut"];
            const observer = new IntersectionObserver({
                "Performance.useEffect": (entries)=>{
                    if (entries[0].isIntersecting) {
                        setIsInView(true);
                        el.classList.add('is-in');
                        observer.disconnect();
                        if (prefersReducedMotion) {
                            const staticVals = {};
                            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$charts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["performanceData"].forEach({
                                "Performance.useEffect": (cat)=>{
                                    cat.bars.forEach({
                                        "Performance.useEffect": (b)=>{
                                            staticVals[`${cat.title}-${b.label}`] = b.value.toFixed(1);
                                        }
                                    }["Performance.useEffect"]);
                                }
                            }["Performance.useEffect"]);
                            setAnimatedValues(staticVals);
                            return;
                        }
                        // Count-up animation
                        const duration = 1300;
                        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$charts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["performanceData"].forEach({
                            "Performance.useEffect": (category)=>{
                                category.bars.forEach({
                                    "Performance.useEffect": (bar, i)=>{
                                        const key = `${category.title}-${bar.label}`;
                                        const delay = i % 4 * 110;
                                        const target = bar.value;
                                        setTimeout({
                                            "Performance.useEffect": ()=>{
                                                const startTime = performance.now();
                                                const step = {
                                                    "Performance.useEffect.step": (now)=>{
                                                        const elapsed = now - startTime;
                                                        const progress = Math.min(1, elapsed / duration);
                                                        const currentVal = (target * easeOut(progress)).toFixed(1);
                                                        setAnimatedValues({
                                                            "Performance.useEffect.step": (prev)=>({
                                                                    ...prev,
                                                                    [key]: currentVal
                                                                })
                                                        }["Performance.useEffect.step"]);
                                                        if (progress < 1) {
                                                            requestAnimationFrame(step);
                                                        }
                                                    }
                                                }["Performance.useEffect.step"];
                                                requestAnimationFrame(step);
                                            }
                                        }["Performance.useEffect"], delay);
                                    }
                                }["Performance.useEffect"]);
                            }
                        }["Performance.useEffect"]);
                    }
                }
            }["Performance.useEffect"], {
                threshold: 0.35
            });
            observer.observe(el);
            return ({
                "Performance.useEffect": ()=>{
                    observer.disconnect();
                }
            })["Performance.useEffect"];
        }
    }["Performance.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "perf",
        "aria-labelledby": "perf-title",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "wrap",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "h2",
                    id: "perf-title",
                    "data-reveal": true,
                    "data-heading": true,
                    children: "Performance that stands out"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Performance.tsx",
                    lineNumber: 93,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "lead",
                    "data-reveal": true,
                    style: {
                        '--d': '80ms'
                    },
                    children: "We benchmark Kraft against leading design tools across speed, quality, and consistency. The results speak for themselves."
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Performance.tsx",
                    lineNumber: 96,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    ref: groupRef,
                    className: `charts ${isInView ? 'is-in' : ''}`,
                    "data-chart-group": true,
                    children: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$charts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["performanceData"].map((category)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "chart",
                            "data-reveal": true,
                            style: category.delay ? {
                                '--d': category.delay
                            } : undefined,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    children: category.title
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Performance.tsx",
                                    lineNumber: 108,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    children: category.bars.map((bar, i)=>{
                                        const key = `${category.title}-${bar.label}`;
                                        const displayVal = animatedValues[key] || (isInView ? bar.value.toFixed(1) : '0.0');
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            className: `bar ${bar.isKraft ? 'is-kraft' : ''}`,
                                            "data-key": key,
                                            "data-value": bar.value,
                                            style: {
                                                '--bd': `${i * 110}ms`
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "bar__label",
                                                    children: bar.label
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/components/sections/Performance.tsx",
                                                    lineNumber: 122,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "bar__track",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "bar__fill"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/components/sections/Performance.tsx",
                                                        lineNumber: 124,
                                                        columnNumber: 25
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/components/sections/Performance.tsx",
                                                    lineNumber: 123,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "bar__val",
                                                    children: displayVal
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/components/sections/Performance.tsx",
                                                    lineNumber: 126,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, bar.label, true, {
                                            fileName: "[project]/apps/web/components/sections/Performance.tsx",
                                            lineNumber: 115,
                                            columnNumber: 21
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Performance.tsx",
                                    lineNumber: 109,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, category.title, true, {
                            fileName: "[project]/apps/web/components/sections/Performance.tsx",
                            lineNumber: 102,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Performance.tsx",
                    lineNumber: 100,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/components/sections/Performance.tsx",
            lineNumber: 92,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/components/sections/Performance.tsx",
        lineNumber: 91,
        columnNumber: 5
    }, this);
}
_s(Performance, "qGSMG4s37pjDwHjofyV30X9roaE=");
_c = Performance;
const __TURBOPACK__default__export__ = Performance;
var _c;
__turbopack_context__.k.register(_c, "Performance");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/sections/Presets.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Presets",
    ()=>Presets,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/image-component.js [app-client] (ecmascript) <export Image as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$presets$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/data/presets.ts [app-client] (ecmascript)");
'use client';
;
;
;
function Presets() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "presets",
        id: "templates",
        "aria-labelledby": "presets-title",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "wrap",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "presets__head",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "h2",
                            id: "presets-title",
                            "data-reveal": true,
                            "data-heading": true,
                            children: "A Recovery Strategy for Every Model Failure."
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/sections/Presets.tsx",
                            lineNumber: 12,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "presets__lead lead",
                            "data-reveal": true,
                            children: "AMRS uses a collection of recovery techniques to address different model degradation patterns. Strategies are selected based on diagnosis results, prerequisites and estimated computational cost."
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/sections/Presets.tsx",
                            lineNumber: 15,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/sections/Presets.tsx",
                    lineNumber: 11,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "preset-grid",
                    "data-stagger": true,
                    children: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$presets$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["presetsData"].map((preset)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            className: "preset group",
                            href: preset.href,
                            "data-reveal": true,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__["default"], {
                                    src: preset.image,
                                    alt: preset.title,
                                    width: preset.width,
                                    height: preset.height
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Presets.tsx",
                                    lineNumber: 23,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "preset__overlay",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "preset__tag",
                                            children: preset.index
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Presets.tsx",
                                            lineNumber: 30,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "preset__title",
                                            children: preset.title
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Presets.tsx",
                                            lineNumber: 31,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "preset__desc",
                                            children: preset.description
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Presets.tsx",
                                            lineNumber: 32,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/components/sections/Presets.tsx",
                                    lineNumber: 29,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, preset.id, true, {
                            fileName: "[project]/apps/web/components/sections/Presets.tsx",
                            lineNumber: 22,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Presets.tsx",
                    lineNumber: 20,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "preset-foot",
                    "data-reveal": true,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: "AMRS uses a collection of recovery techniques to address different model degradation patterns. Strategies are selected based on diagnosis results, prerequisites and estimated computational cost."
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/sections/Presets.tsx",
                            lineNumber: 39,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            className: "see-all",
                            href: "#waitlist",
                            children: [
                                "Explore all strategies",
                                ' ',
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    "aria-hidden": "true",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                        href: "#i-arrow-right"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/components/sections/Presets.tsx",
                                        lineNumber: 45,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Presets.tsx",
                                    lineNumber: 44,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/components/sections/Presets.tsx",
                            lineNumber: 42,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/sections/Presets.tsx",
                    lineNumber: 38,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/components/sections/Presets.tsx",
            lineNumber: 10,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/components/sections/Presets.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, this);
}
_c = Presets;
const __TURBOPACK__default__export__ = Presets;
var _c;
__turbopack_context__.k.register(_c, "Presets");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/sections/Statement.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Statement",
    ()=>Statement,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/gsap/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/gsap/ScrollTrigger.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
if ("TURBOPACK compile-time truthy", 1) {
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].registerPlugin(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollTrigger"]);
}
const STATEMENT_TEXT = 'When Models Fail, AMRS Finds a Way Forward.';
function Statement() {
    _s();
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const textRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const words = STATEMENT_TEXT.split(/\s+/);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Statement.useEffect": ()=>{
            const el = textRef.current;
            if (!el) return;
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            // IntersectionObserver for initial entrance
            const observer = new IntersectionObserver({
                "Statement.useEffect": (entries)=>{
                    if (entries[0].isIntersecting) {
                        el.classList.add('is-in');
                        observer.disconnect();
                    }
                }
            }["Statement.useEffect"], {
                threshold: 0.6
            });
            observer.observe(el);
            if (prefersReducedMotion) return;
            // Scroll-linked word blur/fade-out as words approach top of viewport
            const innerWords = el.querySelectorAll('.wi');
            const clamp = {
                "Statement.useEffect.clamp": (v, a, b)=>Math.min(b, Math.max(a, v))
            }["Statement.useEffect.clamp"];
            const onScroll = {
                "Statement.useEffect.onScroll": ()=>{
                    const vh = window.innerHeight;
                    const fadeStart = Math.min(150, vh * 0.2);
                    innerWords.forEach({
                        "Statement.useEffect.onScroll": (word)=>{
                            const y = word.getBoundingClientRect().top;
                            if (y < fadeStart) {
                                const t = clamp((fadeStart - y) / (fadeStart * 0.8), 0, 1);
                                word.style.filter = `blur(${(t * 10).toFixed(1)}px)`;
                                word.style.opacity = (1 - t * 0.85).toFixed(2);
                            } else {
                                word.style.filter = '';
                                word.style.opacity = '';
                            }
                        }
                    }["Statement.useEffect.onScroll"]);
                }
            }["Statement.useEffect.onScroll"];
            window.addEventListener('scroll', onScroll, {
                passive: true
            });
            return ({
                "Statement.useEffect": ()=>{
                    observer.disconnect();
                    window.removeEventListener('scroll', onScroll);
                }
            })["Statement.useEffect"];
        }
    }["Statement.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        ref: containerRef,
        className: "statement",
        id: "statement",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            ref: textRef,
            className: "statement__text",
            "data-words": true,
            "aria-label": STATEMENT_TEXT,
            children: words.map((word, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Fragment, {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "w",
                            style: {
                                '--i': i
                            },
                            "aria-hidden": "true",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "wi",
                                children: word
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Statement.tsx",
                                lineNumber: 76,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/sections/Statement.tsx",
                            lineNumber: 71,
                            columnNumber: 13
                        }, this),
                        i < words.length - 1 ? ' ' : ''
                    ]
                }, i, true, {
                    fileName: "[project]/apps/web/components/sections/Statement.tsx",
                    lineNumber: 70,
                    columnNumber: 11
                }, this))
        }, void 0, false, {
            fileName: "[project]/apps/web/components/sections/Statement.tsx",
            lineNumber: 68,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/components/sections/Statement.tsx",
        lineNumber: 67,
        columnNumber: 5
    }, this);
}
_s(Statement, "+zA67rp87Mddr25mzy7oxhufayU=");
_c = Statement;
const __TURBOPACK__default__export__ = Statement;
var _c;
__turbopack_context__.k.register(_c, "Statement");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/sections/Steps.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Steps",
    ()=>Steps,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/image-component.js [app-client] (ecmascript) <export Image as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$steps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/data/steps.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function Steps() {
    _s();
    const trackRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Steps.useEffect": ()=>{
            const track = trackRef.current;
            if (!track) return;
            let isDown = false;
            let startX = 0;
            let scrollStart = 0;
            let moved = 0;
            let lastX = 0;
            let lastTime = 0;
            let vel = 0;
            let rafInertia = null;
            const stopInertia = {
                "Steps.useEffect.stopInertia": ()=>{
                    if (rafInertia) {
                        cancelAnimationFrame(rafInertia);
                        rafInertia = null;
                    }
                }
            }["Steps.useEffect.stopInertia"];
            const runInertia = {
                "Steps.useEffect.runInertia": ()=>{
                    if (Math.abs(vel) > 0.3) {
                        track.scrollLeft -= vel;
                        vel *= 0.94;
                        rafInertia = requestAnimationFrame(runInertia);
                    } else {
                        rafInertia = null;
                    }
                }
            }["Steps.useEffect.runInertia"];
            const onPointerDown = {
                "Steps.useEffect.onPointerDown": (e)=>{
                    if (e.button !== 0 && e.pointerType === 'mouse') return;
                    isDown = true;
                    stopInertia();
                    startX = e.clientX;
                    scrollStart = track.scrollLeft;
                    lastX = e.clientX;
                    lastTime = performance.now();
                    moved = 0;
                    vel = 0;
                }
            }["Steps.useEffect.onPointerDown"];
            const onPointerMove = {
                "Steps.useEffect.onPointerMove": (e)=>{
                    if (!isDown) return;
                    const dx = e.clientX - startX;
                    moved += Math.abs(e.clientX - lastX);
                    if (moved > 4) {
                        track.classList.add('is-dragging');
                    }
                    track.scrollLeft = scrollStart - dx;
                    const now = performance.now();
                    const dt = Math.max(1, now - lastTime);
                    vel = (e.clientX - lastX) / dt * 16;
                    lastX = e.clientX;
                    lastTime = now;
                }
            }["Steps.useEffect.onPointerMove"];
            const onPointerUp = {
                "Steps.useEffect.onPointerUp": ()=>{
                    if (!isDown) return;
                    isDown = false;
                    track.classList.remove('is-dragging');
                    if (moved > 4 && Math.abs(vel) > 1) {
                        runInertia();
                    }
                }
            }["Steps.useEffect.onPointerUp"];
            const onClick = {
                "Steps.useEffect.onClick": (e)=>{
                    if (moved > 4) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            }["Steps.useEffect.onClick"];
            track.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
            track.addEventListener('click', onClick, {
                capture: true
            });
            return ({
                "Steps.useEffect": ()=>{
                    stopInertia();
                    track.removeEventListener('pointerdown', onPointerDown);
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);
                    track.removeEventListener('click', onClick, {
                        capture: true
                    });
                }
            })["Steps.useEffect"];
        }
    }["Steps.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "steps",
        id: "features",
        "aria-labelledby": "steps-title",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "wrap",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "h2",
                    id: "steps-title",
                    "data-reveal": true,
                    "data-heading": true,
                    children: "From Model Failure to Verified Recovery in Four Steps."
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Steps.tsx",
                    lineNumber: 103,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/sections/Steps.tsx",
                lineNumber: 102,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: trackRef,
                className: "steps__track",
                "data-drag": true,
                "data-stagger": true,
                children: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$steps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stepsData"].map((step)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                        className: "step",
                        "data-reveal": true,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                children: step.title
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Steps.tsx",
                                lineNumber: 110,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: step.description
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Steps.tsx",
                                lineNumber: 111,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__["default"], {
                                src: step.image,
                                alt: "",
                                width: step.width,
                                height: step.height,
                                draggable: false
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Steps.tsx",
                                lineNumber: 112,
                                columnNumber: 13
                            }, this)
                        ]
                    }, step.id, true, {
                        fileName: "[project]/apps/web/components/sections/Steps.tsx",
                        lineNumber: 109,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/apps/web/components/sections/Steps.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/sections/Steps.tsx",
        lineNumber: 101,
        columnNumber: 5
    }, this);
}
_s(Steps, "25ZDZIuc2yxXMsah1kdnpaf+Fmo=");
_c = Steps;
const __TURBOPACK__default__export__ = Steps;
var _c;
__turbopack_context__.k.register(_c, "Steps");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/sections/Testimonials.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Testimonials",
    ()=>Testimonials,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/image-component.js [app-client] (ecmascript) <export Image as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$testimonials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/data/testimonials.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function Testimonials() {
    _s();
    const [activeIndex, setActiveIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const trackRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [dragOffset, setDragOffset] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [isDragging, setIsDragging] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [stepSize, setStepSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Testimonials.useEffect": ()=>{
            const track = trackRef.current;
            if (!track) return;
            const updateStep = {
                "Testimonials.useEffect.updateStep": ()=>{
                    const firstCard = track.querySelector('.t-card');
                    if (!firstCard) return;
                    const style = window.getComputedStyle(track);
                    const gap = parseFloat(style.columnGap || style.gap || '17');
                    setStepSize(firstCard.offsetWidth + gap);
                }
            }["Testimonials.useEffect.updateStep"];
            updateStep();
            window.addEventListener('resize', updateStep);
            const ro = new ResizeObserver(updateStep);
            ro.observe(track);
            return ({
                "Testimonials.useEffect": ()=>{
                    window.removeEventListener('resize', updateStep);
                    ro.disconnect();
                }
            })["Testimonials.useEffect"];
        }
    }["Testimonials.useEffect"], []);
    const goTo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Testimonials.useCallback[goTo]": (index)=>{
            const clamped = Math.max(0, Math.min(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$testimonials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["testimonialsData"].length - 1, index));
            setActiveIndex(clamped);
            setDragOffset(0);
        }
    }["Testimonials.useCallback[goTo]"], []);
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Testimonials.useCallback[next]": ()=>goTo(activeIndex + 1)
    }["Testimonials.useCallback[next]"], [
        activeIndex,
        goTo
    ]);
    const prev = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Testimonials.useCallback[prev]": ()=>goTo(activeIndex - 1)
    }["Testimonials.useCallback[prev]"], [
        activeIndex,
        goTo
    ]);
    // Pointer drag handling
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Testimonials.useEffect": ()=>{
            const track = trackRef.current;
            if (!track) return;
            let startX = 0;
            let currentDx = 0;
            let dragging = false;
            const onPointerDown = {
                "Testimonials.useEffect.onPointerDown": (e)=>{
                    if (e.button !== 0 && e.pointerType === 'mouse') return;
                    dragging = true;
                    startX = e.clientX;
                    currentDx = 0;
                    setIsDragging(true);
                }
            }["Testimonials.useEffect.onPointerDown"];
            const onPointerMove = {
                "Testimonials.useEffect.onPointerMove": (e)=>{
                    if (!dragging) return;
                    let dx = e.clientX - startX;
                    // Edge resistance
                    if (activeIndex === 0 && dx > 0 || activeIndex === __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$testimonials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["testimonialsData"].length - 1 && dx < 0) {
                        dx *= 0.3;
                    }
                    currentDx = dx;
                    setDragOffset(dx);
                }
            }["Testimonials.useEffect.onPointerMove"];
            const onPointerUp = {
                "Testimonials.useEffect.onPointerUp": ()=>{
                    if (!dragging) return;
                    dragging = false;
                    setIsDragging(false);
                    if (currentDx < -60 && activeIndex < __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$testimonials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["testimonialsData"].length - 1) {
                        goTo(activeIndex + 1);
                    } else if (currentDx > 60 && activeIndex > 0) {
                        goTo(activeIndex - 1);
                    } else {
                        setDragOffset(0);
                    }
                }
            }["Testimonials.useEffect.onPointerUp"];
            track.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
            return ({
                "Testimonials.useEffect": ()=>{
                    track.removeEventListener('pointerdown', onPointerDown);
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);
                }
            })["Testimonials.useEffect"];
        }
    }["Testimonials.useEffect"], [
        activeIndex,
        goTo
    ]);
    // Keyboard navigation
    const handleKeyDown = (e)=>{
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
    };
    const trackTranslate = -(activeIndex * stepSize) + dragOffset;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "testimonials",
        id: "experiments",
        "aria-labelledby": "t-title",
        "aria-roledescription": "carousel",
        onKeyDown: handleKeyDown,
        tabIndex: 0,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "wrap",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "h2",
                    id: "t-title",
                    "data-reveal": true,
                    "data-heading": true,
                    children: "See How AMRS Approaches Real Model Failures."
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                    lineNumber: 119,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                lineNumber: 118,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "t-wrap",
                "data-reveal": true,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    ref: trackRef,
                    className: `t-track ${isDragging ? 'is-dragging' : ''}`,
                    style: {
                        transform: `translate3d(${trackTranslate}px, 0, 0)`
                    },
                    children: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$testimonials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["testimonialsData"].map((item, i)=>{
                        const isActive = i === activeIndex;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                            className: `t-card ${isActive ? 'is-active' : ''}`,
                            "aria-roledescription": "slide",
                            "aria-label": `${i + 1} of ${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$testimonials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["testimonialsData"].length}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "t-main",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "tag",
                                            children: item.tag
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                            lineNumber: 143,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "t-company",
                                            children: item.company
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                            lineNumber: 144,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "t-experiment-box",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "t-exp-row",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            className: "t-exp-label",
                                                            children: "Problem:"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                            lineNumber: 147,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "t-exp-val",
                                                            children: item.problem
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                            lineNumber: 148,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                    lineNumber: 146,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "t-exp-row",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            className: "t-exp-label",
                                                            children: "Expected recovery:"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                            lineNumber: 151,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "t-exp-val",
                                                            children: item.recovery
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                            lineNumber: 152,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                    lineNumber: 150,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                            lineNumber: 145,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("blockquote", {
                                            className: "t-quote",
                                            children: item.quote
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                            lineNumber: 155,
                                            columnNumber: 19
                                        }, this),
                                        item.outcome && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "t-outcome",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "t-outcome-badge",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                            "aria-hidden": "true",
                                                            width: "12",
                                                            height: "12",
                                                            viewBox: "0 0 16 16",
                                                            fill: "none",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                d: "M13.3334 4L6.00008 11.3333L2.66675 8",
                                                                stroke: "currentColor",
                                                                strokeWidth: "2.2",
                                                                strokeLinecap: "round",
                                                                strokeLinejoin: "round"
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                                lineNumber: 160,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                            lineNumber: 159,
                                                            columnNumber: 25
                                                        }, this),
                                                        "Recovery Outcome"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                    lineNumber: 158,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "t-outcome-text",
                                                    children: item.outcome
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                    lineNumber: 170,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                            lineNumber: 157,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                    lineNumber: 142,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                                    className: "t-side",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__["default"], {
                                            className: "t-avatar",
                                            src: item.avatar,
                                            alt: item.company,
                                            width: 107,
                                            height: 160,
                                            draggable: false,
                                            unoptimized: true
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                            lineNumber: 176,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "t-who",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                                                    children: item.role
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                    lineNumber: 186,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: item.author
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                    lineNumber: 187,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                            lineNumber: 185,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "t-stats",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                                                    children: item.statsTitle
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                    lineNumber: 190,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                                                    children: item.stats.map((stat, sIndex)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                                                    children: stat.label
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                                    lineNumber: 194,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                                                    children: stat.value
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                                    lineNumber: 195,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, sIndex, true, {
                                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                            lineNumber: 193,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                                    lineNumber: 191,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                            lineNumber: 189,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                    lineNumber: 175,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, item.id, true, {
                            fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                            lineNumber: 136,
                            columnNumber: 15
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                    lineNumber: 125,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                lineNumber: 124,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "wrap t-controls",
                "data-reveal": true,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "t-dots",
                        role: "tablist",
                        "aria-label": "Choose experiment",
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$testimonials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["testimonialsData"].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: i === activeIndex ? 'is-active' : '',
                                role: "tab",
                                "aria-selected": i === activeIndex,
                                "aria-label": `Experiment ${i + 1}`,
                                onClick: ()=>goTo(i)
                            }, i, false, {
                                fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                lineNumber: 210,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                        lineNumber: 208,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        className: "see-all t-cta",
                        href: "#features",
                        children: [
                            "Explore All Experiments",
                            ' ',
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                "aria-hidden": "true",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                    href: "#i-arrow-right"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                    lineNumber: 225,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                lineNumber: 224,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                        lineNumber: 222,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "t-arrows",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "t-prev",
                                "aria-label": "Previous experiment",
                                disabled: activeIndex === 0,
                                onClick: prev,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    "aria-hidden": "true",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                        href: "#i-chev-l"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                        lineNumber: 238,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                    lineNumber: 237,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                lineNumber: 230,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "t-next",
                                "aria-label": "Next experiment",
                                disabled: activeIndex === __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$data$2f$testimonials$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["testimonialsData"].length - 1,
                                onClick: next,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    "aria-hidden": "true",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("use", {
                                        href: "#i-chev-r"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                        lineNumber: 249,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                    lineNumber: 248,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                                lineNumber: 241,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                        lineNumber: 229,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
                lineNumber: 207,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/sections/Testimonials.tsx",
        lineNumber: 110,
        columnNumber: 5
    }, this);
}
_s(Testimonials, "lY4OgDCUREHU8p5+NqHHi75lQys=");
_c = Testimonials;
const __TURBOPACK__default__export__ = Testimonials;
var _c;
__turbopack_context__.k.register(_c, "Testimonials");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/data/charts.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "performanceData",
    ()=>performanceData
]);
const performanceData = [
    {
        title: 'Speed',
        bars: [
            {
                label: 'Kraft',
                value: 94.2,
                isKraft: true
            },
            {
                label: 'Figma AI',
                value: 71.8
            },
            {
                label: 'Canva Magic',
                value: 68.4
            },
            {
                label: 'Framer AI',
                value: 58.7
            }
        ]
    },
    {
        title: 'Quality',
        delay: '90ms',
        bars: [
            {
                label: 'Kraft',
                value: 96.8,
                isKraft: true
            },
            {
                label: 'Figma AI',
                value: 89.2
            },
            {
                label: 'Canva Magic',
                value: 82.1
            },
            {
                label: 'Framer AI',
                value: 79.4
            }
        ]
    },
    {
        title: 'Consistency',
        delay: '180ms',
        bars: [
            {
                label: 'Kraft',
                value: 98.1,
                isKraft: true
            },
            {
                label: 'Figma AI',
                value: 81.3
            },
            {
                label: 'Framer AI',
                value: 76.9
            },
            {
                label: 'Canva Magic',
                value: 72.4
            }
        ]
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/data/faq.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "faqData",
    ()=>faqData
]);
const faqData = [
    {
        id: 'faq-1',
        question: 'What is AMRS?',
        answer: 'AMRS (Adaptive Model Recovery System) is an intelligent framework that diagnoses underperforming machine learning models and attempts targeted recovery instead of relying on complete retraining.',
        defaultOpen: true
    },
    {
        id: 'faq-2',
        question: 'How does AMRS identify model failures?',
        answer: 'It analyzes metrics such as training and validation performance, generalization gap, validation-loss trends and calibration error to identify potential failure modes.'
    },
    {
        id: 'faq-3',
        question: 'Does AMRS retrain the entire model?',
        answer: 'Not by default. It prioritizes targeted recovery techniques that modify selected parameters or statistics while preserving previously learned knowledge.'
    },
    {
        id: 'faq-4',
        question: 'How does AMRS decide whether a recovery is successful?',
        answer: 'Every candidate is evaluated against predefined verification criteria using a separate holdout dataset. Candidates that fail are rejected.'
    },
    {
        id: 'faq-5',
        question: 'What happens when recovery fails?',
        answer: 'AMRS retains the original model and records a rollback decision with the reasons for rejection.'
    },
    {
        id: 'faq-6',
        question: 'Which models does AMRS support?',
        answer: 'The initial MVP focuses on supported PyTorch image-classification architectures, including MLP, small CNN and ResNet18 CIFAR configurations.'
    },
    {
        id: 'faq-7',
        question: 'Can AMRS monitor training?',
        answer: 'Yes. The MVP includes monitoring and recorded-training-history replay to identify potential overfitting and instability triggers.'
    },
    {
        id: 'faq-8',
        question: 'Does AMRS support transformer models?',
        answer: 'Transformer recovery through Hugging Face PEFT/LoRA is planned as a post-MVP capability.'
    }
];
const __TURBOPACK__default__export__ = faqData;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/data/gallery.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "galleryRows",
    ()=>galleryRows
]);
const galleryRows = [
    [
        {
            src: '/assets/img/g01-plant.jpg',
            alt: 'Glowing wheat stalks against a dusk sky',
            width: 406,
            height: 308
        },
        {
            src: '/assets/img/g02-car.jpg',
            alt: 'Car driving along a steep ridge',
            width: 242,
            height: 324,
            isTall: true
        },
        {
            src: '/assets/img/g03-wave.jpg',
            alt: 'Waves of dunes under an indigo sky',
            width: 406,
            height: 308
        }
    ],
    [
        {
            src: '/assets/img/g04-skier-swirl.jpg',
            alt: 'Lone skier on swirling dunes',
            width: 417,
            height: 296
        },
        {
            src: '/assets/img/g05-astronaut-planet.jpg',
            alt: 'Figure standing beneath a ringed planet',
            width: 237,
            height: 318,
            isTall: true
        },
        {
            src: '/assets/img/g06-skier-dune.jpg',
            alt: 'Skier crossing a dune ridge',
            width: 416,
            height: 296
        }
    ],
    [
        {
            src: '/assets/img/g07-swirl-road.jpg',
            alt: 'Dark silhouette over flowing light ribbons',
            width: 392,
            height: 312
        },
        {
            src: '/assets/img/g08-arch-road.jpg',
            alt: 'Road curving beneath a glowing arch',
            width: 244,
            height: 326,
            isTall: true
        },
        {
            src: '/assets/img/g09-arch-glow.jpg',
            alt: 'Glowing dome rising from a plain',
            width: 390,
            height: 314
        }
    ],
    [
        {
            src: '/assets/img/g10-surf-figure.jpg',
            alt: 'Silhouette surfing a wave of light',
            width: 406,
            height: 288
        },
        {
            src: '/assets/img/g11-astronaut-white.jpg',
            alt: 'Astronaut riding a luminous slope',
            width: 235,
            height: 314,
            isTall: true
        },
        {
            src: '/assets/img/g12-cat-dune.jpg',
            alt: 'Cat walking across a dune',
            width: 404,
            height: 288
        }
    ]
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/data/logos.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "logosData",
    ()=>logosData
]);
const logosData = [
    {
        id: 'python',
        name: 'Python',
        href: 'https://www.python.org',
        iconId: 'l-python',
        color: '#3776ab'
    },
    {
        id: 'pytorch',
        name: 'PyTorch',
        href: 'https://pytorch.org',
        iconId: 'l-pytorch',
        color: '#ee4c2c'
    },
    {
        id: 'fastapi',
        name: 'FastAPI',
        href: 'https://fastapi.tiangolo.com',
        iconId: 'l-fastapi',
        color: '#009688'
    },
    {
        id: 'nextjs',
        name: 'Next.js',
        href: 'https://nextjs.org',
        iconId: 'l-nextjs',
        color: '#ffffff'
    },
    {
        id: 'typescript',
        name: 'TypeScript',
        href: 'https://www.typescriptlang.org',
        iconId: 'l-typescript',
        color: '#3178c6'
    },
    {
        id: 'tailwindcss',
        name: 'Tailwind CSS',
        href: 'https://tailwindcss.com',
        iconId: 'l-tailwindcss',
        color: '#38bdf8'
    },
    {
        id: 'numpy',
        name: 'NumPy',
        href: 'https://numpy.org',
        iconId: 'l-numpy',
        color: '#4dabcf'
    },
    {
        id: 'scikitlearn',
        name: 'Scikit-learn',
        href: 'https://scikit-learn.org',
        iconId: 'l-scikitlearn',
        color: '#f89939'
    },
    {
        id: 'plotly',
        name: 'Plotly',
        href: 'https://plotly.com',
        iconId: 'l-plotly',
        color: '#3f4f75'
    }
];
const __TURBOPACK__default__export__ = logosData;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/data/presets.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "presetsData",
    ()=>presetsData
]);
const presetsData = [
    {
        id: 'checkpoint-averaging',
        index: '01',
        title: 'Checkpoint Reversion & Averaging',
        description: 'Recover from unstable training using previous checkpoints and weight averaging.',
        image: '/assets/img/preset-startup.jpg',
        width: 271,
        height: 339,
        href: '#features'
    },
    {
        id: 'weight-interpolation',
        index: '02',
        title: 'Weight Interpolation',
        description: 'Combine model parameter states to explore improved solutions.',
        image: '/assets/img/preset-ecommerce.jpg',
        width: 271,
        height: 339,
        href: '#features'
    },
    {
        id: 'batchnorm-recalibration',
        index: '03',
        title: 'BatchNorm Recalibration',
        description: 'Recalibrate normalization statistics to address distribution shifts.',
        image: '/assets/img/preset-saas.jpg',
        width: 271,
        height: 339,
        href: '#features'
    },
    {
        id: 'selective-finetuning',
        index: '04',
        title: 'Selective Fine-Tuning',
        description: 'Adjust selected model parameters without unnecessarily modifying the entire network.',
        image: '/assets/img/g03-wave.jpg',
        width: 271,
        height: 339,
        href: '#features'
    },
    {
        id: 'l2-sp-regularization',
        index: '05',
        title: 'L2-SP Regularization',
        description: 'Constrain parameter changes to preserve useful pretrained knowledge.',
        image: '/assets/img/g08-arch-road.jpg',
        width: 271,
        height: 339,
        href: '#features'
    },
    {
        id: 'temperature-scaling',
        index: '06',
        title: 'Temperature Scaling',
        description: "Improve prediction calibration without changing the model's predicted class ranking.",
        image: '/assets/img/g09-arch-glow.jpg',
        width: 271,
        height: 339,
        href: '#features'
    }
];
const __TURBOPACK__default__export__ = presetsData;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/data/steps.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "stepsData",
    ()=>stepsData
]);
const stepsData = [
    {
        id: 1,
        title: '01 — Diagnose',
        description: 'Analyze model performance, validation trends, generalization gaps and calibration errors to identify potential failure modes.',
        image: '/assets/img/step-describe.jpg',
        width: 220,
        height: 220
    },
    {
        id: 2,
        title: '02 — Select',
        description: 'Identify eligible recovery techniques and prioritize them according to estimated computational cost.',
        image: '/assets/img/step-generate.jpg',
        width: 220,
        height: 220
    },
    {
        id: 3,
        title: '03 — Recover',
        description: 'Apply targeted parameter adjustments to a copy of the original model while preserving its learned knowledge.',
        image: '/assets/img/step-refine.jpg',
        width: 220,
        height: 220
    },
    {
        id: 4,
        title: '04 — Verify',
        description: 'Evaluate the recovered candidate against predefined acceptance criteria. Accept improvements or roll back safely.',
        image: '/assets/img/step-ship.jpg',
        width: 155,
        height: 200
    }
];
const __TURBOPACK__default__export__ = stepsData;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/data/testimonials.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "testimonialsData",
    ()=>testimonialsData
]);
const testimonialsData = [
    {
        id: 1,
        tag: 'Scenario S1 · Reproducible Experiment',
        company: 'Overfitting Recovery',
        problem: 'Training and validation performance diverge.',
        recovery: 'Checkpoint averaging or selective fine-tuning with L2-SP.',
        quote: 'AMRS arrests model degradation by identifying the divergence point in the training trajectory, combining proximal stationary checkpoints and selectively freezing earlier representation layers.',
        outcome: 'Empirical holdout confirms restored generalization without full retraining.',
        author: 'ResNet18 CIFAR',
        role: 'Target Architecture',
        avatar: '/assets/img/g03-wave.jpg',
        fallbackAvatar: '/assets/img/g03-wave.jpg',
        statsTitle: 'Experiment Specifications',
        stats: [
            {
                label: 'Scenario ID',
                value: 'S1'
            },
            {
                label: 'Architecture',
                value: 'ResNet18'
            },
            {
                label: 'Failure Mode',
                value: 'Divergent Loss'
            },
            {
                label: 'Recovery Strategy',
                value: 'Checkpoint Avg / L2-SP'
            }
        ]
    },
    {
        id: 2,
        tag: 'Scenario S2 · Reproducible Experiment',
        company: 'Calibration Recovery',
        problem: 'Model confidence is inflated.',
        recovery: 'Temperature scaling.',
        quote: 'Optimizes temperature scaling over validation logits to recalibrate predicted softmax probabilities, drastically reducing Expected Calibration Error without degrading classification accuracy.',
        outcome: 'Post-hoc calibration minimizes ECE while strictly preserving top-1 accuracy.',
        author: 'Vision Classifier',
        role: 'Target Architecture',
        avatar: '/assets/img/g09-arch-glow.jpg',
        fallbackAvatar: '/assets/img/g09-arch-glow.jpg',
        statsTitle: 'Experiment Specifications',
        stats: [
            {
                label: 'Scenario ID',
                value: 'S2'
            },
            {
                label: 'Architecture',
                value: 'Vision CNN'
            },
            {
                label: 'Failure Mode',
                value: 'Overconfidence'
            },
            {
                label: 'Recovery Strategy',
                value: 'Temperature Scaling'
            }
        ]
    },
    {
        id: 3,
        tag: 'Scenario S4 · Reproducible Experiment',
        company: 'Training Instability',
        problem: 'Unstable loss and degraded checkpoints.',
        recovery: 'Checkpoint reversion or averaging.',
        quote: 'Audits parameter divergence after unexpected gradient shocks, restoring verified stable weights and averaging adjacent checkpoints with automated holdout verification.',
        outcome: 'Weight averaging eliminates loss divergence and restores parameter stability.',
        author: 'PyTorch Vision Model',
        role: 'Target Architecture',
        avatar: '/assets/img/g07-swirl-road.jpg',
        fallbackAvatar: '/assets/img/g07-swirl-road.jpg',
        statsTitle: 'Experiment Specifications',
        stats: [
            {
                label: 'Scenario ID',
                value: 'S4'
            },
            {
                label: 'Architecture',
                value: 'Deep Vision'
            },
            {
                label: 'Failure Mode',
                value: 'Loss Spike Shock'
            },
            {
                label: 'Recovery Strategy',
                value: 'Checkpoint Reversion'
            }
        ]
    }
];
const __TURBOPACK__default__export__ = testimonialsData;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);})()

//# sourceMappingURL=apps_web_0u1xkka_24226._.js.map