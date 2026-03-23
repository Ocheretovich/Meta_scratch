import Image from 'next/image';
import { useTooltip } from '@/context/TooltipContext';
import { RESOURCE_ICONS } from '@/data/assetManifest';

interface GameResourcesProps {
    resources: {
        power: number;
        knowledge: number;
        art: number;
        fame: number;
        product: number;
        electricity: number;
        recycling: number;
    };
    victoryPoints: number;
    isStep3?: boolean;
    exchangeStep?: number;
    onResourceClick?: (resource: string) => void;
}

export default function GameResources({ 
    resources, 
    victoryPoints, 
    isStep3, 
    exchangeStep, 
    onResourceClick 
}: GameResourcesProps) {
    const { showTooltip, hideTooltip } = useTooltip();
    if (!resources) return null;

    // Helper to render a resource slot
    const renderSlot = (x: number, y: number, iconPath: string, count: number, label: string) => (
        <div
            className={`absolute flex items-center justify-center gap-1 z-10 pointer-events-auto transition-all ${isStep3 && exchangeStep === 1 ? 'cursor-pointer hover:scale-110 active:scale-95 ring-2 ring-yellow-400/50 rounded-lg bg-yellow-400/10' : 'cursor-help'}`}
            style={{ left: `${x}px`, top: `${y}px`, width: '30px', height: '30px' }}
            onMouseEnter={() => showTooltip(label)}
            onMouseLeave={hideTooltip}
            onClick={() => {
                if (isStep3 && exchangeStep === 1 && onResourceClick) {
                    onResourceClick(label.toLowerCase());
                }
            }}
        >
            {/* Icon */}
            <div className="relative w-full h-full">
                <Image src={iconPath} fill className="object-contain" alt={label} />
            </div>

            {/* Count - positioned to the right of the icon */}
            <div className="absolute left-[32px] flex flex-col justify-center h-full w-[40px]">
                <span className="text-white font-bold text-sm leading-none drop-shadow-md">{count}</span>
            </div>
        </div>
    );

    return (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
            <div className="relative w-[632px] h-[45px]">
                {/* SVG Background */}
                <svg width="632" height="45" viewBox="0 0 632 45" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 w-full h-full">
                    <g filter="url(#filter0_d_81_250_res)">
                        <path d="M4 0H628V17C628 28.0457 619.046 37 608 37H24C12.9543 37 4 28.0457 4 17V0Z" fill="url(#paint0_linear_81_250_res)" />
                    </g>
                    <path d="M22.2399 0.149902H20.6699V37.0699H22.2399V0.149902Z" fill="#514D44" />
                    <path d="M106.98 0.149902H105.41V37.0699H106.98V0.149902Z" fill="#514D44" />
                    <path d="M392.121 0.149902H390.551V37.0699H392.121V0.149902Z" fill="#514D44" />
                    <path d="M610.22 0H608.65V36.92H610.22V0Z" fill="#514D44" />

                    <defs>
                        <filter id="filter0_d_81_250_res" x="0" y="0" width="632" height="45" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                            <feOffset dy="4" />
                            <feGaussianBlur stdDeviation="2" />
                            <feComposite in2="hardAlpha" operator="out" />
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_81_250" />
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_81_250" result="shape" />
                        </filter>
                        <linearGradient id="paint0_linear_81_250_res" x1="316" y1="2.09453" x2="316" y2="36.6492" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#171B21" />
                            <stop offset="0.59" stopColor="#1C1F26" />
                            <stop offset="1" stopColor="#23262D" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Resource Slots */}

                {/* victoryPoints (White) x=35.15 y=3.5 */}
                {renderSlot(35.15, 3.5, "/intangibles/resource_VP.png", victoryPoints, "VP")}

                {/* Fame (Yellow) x=118.15 y=3.5 */}
                {renderSlot(118.15, 3.5, RESOURCE_ICONS['fame'], resources.fame, "Fame")}

                {/* Power (Orange) x=189.15 y=4.5 */}
                {renderSlot(189.15, 4.5, RESOURCE_ICONS['power'], resources.power, "Power")}

                {/* Art (Magenta) x=260.15 y=4.5 */}
                {renderSlot(260.15, 4.5, RESOURCE_ICONS['art'], resources.art, "Art")}

                {/* Knowledge (Light Blue) x=331.15 y=4.5 */}
                {renderSlot(331.15, 4.5, RESOURCE_ICONS['knowledge'], resources.knowledge, "Knowledge")}

                {/* Product (Red) x=404.15 y=3.5 */}
                {renderSlot(404.15, 3.5, RESOURCE_ICONS['product'], resources.product, "Product")}

                {/* Electricity (Blue) x=475.15 y=3.5 */}
                {renderSlot(475.15, 3.5, RESOURCE_ICONS['electricity'], resources.electricity, "Electricity")}

                {/* Recycling (Green) x=545.15 y=3.5 */}
                {renderSlot(545.15, 3.5, RESOURCE_ICONS['recycling'], resources.recycling, "Recycling")}

            </div>
        </div>
    );
}
