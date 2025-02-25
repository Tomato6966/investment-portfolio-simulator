import { Loader2 } from "lucide-react";

interface LoadingPlaceholderProps {
    className?: string;
}

export const LoadingPlaceholder = ({ className = "" }: LoadingPlaceholderProps) => (
    <div className={`flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-lg dark:shadow-black/60 ${className}`}>
        <Loader2 className="animate-spin text-cyan-500" size={32} />
    </div>
);
