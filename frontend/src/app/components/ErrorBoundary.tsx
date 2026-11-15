import { Component, type ReactNode } from "react";
import i18n from "../i18n/config";
import { logger } from "../utils/logger";

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Catches render crashes so the user never sees a blank white page
export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        logger.error("Unhandled UI error:", error);
    }

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-body p-6 text-center text-first-text">
                <p>{i18n.t("errors.generic")}</p>
                <button onClick={() => window.location.reload()} className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-black">
                    {i18n.language === "fr" ? "Recharger" : "Reload"}
                </button>
            </div>
        );
    }
}