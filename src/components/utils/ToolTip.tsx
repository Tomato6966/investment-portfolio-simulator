import { HelpCircle } from "lucide-react";
import { ReactNode, useState } from "react";

interface TooltipProps {
    content: string | ReactNode;
    children: ReactNode;
}

export const Tooltip = ({ content, children }: TooltipProps) => {
    const [show, setShow] = useState(false);

    return (
        <div className="relative inline-block">
            <div
                className="flex items-center gap-1 cursor-help"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                {children}
                <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
            {show && (
                <div className="absolute z-50 w-64 p-2 text-sm bg-black text-white rounded shadow-lg dark:shadow-black/60 -left-20 -bottom-2 transform translate-y-full">
                    {content}
                </div>
            )}
        </div>
    );
};
