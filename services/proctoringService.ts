/**
 * Proctoring Service - Focus tracking and fullscreen management
 */

type FocusCallback = (eventType: string, warningCount?: number) => void;

class ProctoringService {
    private candidateId: number | null = null;
    private isActive: boolean = false;
    private warningCount: number = 0;
    private onFocusChange: FocusCallback | null = null;
    private logToBackend: ((eventType: string, details?: string) => Promise<void>) | null = null;

    /**
     * Initialize proctoring for a candidate session
     */
    initialize(
        candidateId: number,
        logFn: (eventType: string, details?: string) => Promise<void>,
        onFocusChange?: FocusCallback
    ) {
        this.candidateId = candidateId;
        this.logToBackend = logFn;
        this.onFocusChange = onFocusChange || null;
        this.warningCount = 0;
        this.isActive = true;

        // Add event listeners
        window.addEventListener('blur', this.handleBlur);
        window.addEventListener('focus', this.handleFocus);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        document.addEventListener('fullscreenchange', this.handleFullscreenChange);

        console.log('[Proctoring] Initialized for candidate:', candidateId);
    }

    /**
     * Request fullscreen mode
     */
    async requestFullscreen(): Promise<boolean> {
        try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if ((elem as any).webkitRequestFullscreen) {
                await (elem as any).webkitRequestFullscreen();
            } else if ((elem as any).msRequestFullscreen) {
                await (elem as any).msRequestFullscreen();
            }
            return true;
        } catch (error) {
            console.warn('[Proctoring] Fullscreen request failed:', error);
            return false;
        }
    }

    /**
     * Exit fullscreen mode
     */
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => { });
        }
    }

    /**
     * Check if currently in fullscreen
     */
    isFullscreen(): boolean {
        return !!document.fullscreenElement;
    }

    /**
     * Handle window blur (tab switch or window focus loss)
     */
    private handleBlur = async () => {
        if (!this.isActive) return;

        this.warningCount++;
        const eventType = 'blur';

        console.log('[Proctoring] Focus lost - warning count:', this.warningCount);

        if (this.logToBackend) {
            await this.logToBackend(eventType, `Tab switched or window lost focus`);
        }

        if (this.onFocusChange) {
            this.onFocusChange(eventType, this.warningCount);
        }
    };

    /**
     * Handle window focus (returning to tab)
     */
    private handleFocus = async () => {
        if (!this.isActive) return;

        const eventType = 'focus';

        console.log('[Proctoring] Focus regained');

        if (this.logToBackend) {
            await this.logToBackend(eventType, 'Window regained focus');
        }

        if (this.onFocusChange) {
            this.onFocusChange(eventType, this.warningCount);
        }
    };

    /**
     * Handle visibility change (page hidden/visible)
     */
    private handleVisibilityChange = async () => {
        if (!this.isActive) return;

        const isHidden = document.hidden;
        const eventType = isHidden ? 'visibility_hidden' : 'visibility_visible';

        if (isHidden) {
            this.warningCount++;
            console.log('[Proctoring] Page hidden - warning count:', this.warningCount);
        }

        if (this.logToBackend) {
            await this.logToBackend(eventType, `Page visibility: ${isHidden ? 'hidden' : 'visible'}`);
        }

        if (this.onFocusChange) {
            this.onFocusChange(eventType, this.warningCount);
        }
    };

    /**
     * Handle fullscreen changes
     */
    private handleFullscreenChange = async () => {
        if (!this.isActive) return;

        const isFullscreenNow = this.isFullscreen();

        if (!isFullscreenNow) {
            this.warningCount++;
            const eventType = 'fullscreen_exit';

            console.log('[Proctoring] Exited fullscreen - warning count:', this.warningCount);

            if (this.logToBackend) {
                await this.logToBackend(eventType, 'Exited fullscreen mode');
            }

            if (this.onFocusChange) {
                this.onFocusChange(eventType, this.warningCount);
            }
        }
    };

    /**
     * Get current warning count
     */
    getWarningCount(): number {
        return this.warningCount;
    }

    /**
     * Stop proctoring and cleanup
     */
    cleanup() {
        this.isActive = false;
        this.candidateId = null;
        this.logToBackend = null;
        this.onFocusChange = null;

        window.removeEventListener('blur', this.handleBlur);
        window.removeEventListener('focus', this.handleFocus);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange);

        console.log('[Proctoring] Cleaned up');
    }
}

export const proctoringService = new ProctoringService();
