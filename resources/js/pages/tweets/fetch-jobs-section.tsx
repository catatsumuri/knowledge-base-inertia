import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useLang } from '@/hooks/useLang';
import { router } from '@inertiajs/react';
import {
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Clock,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface FetchJob {
    id: number;
    tweet_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error_message: string | null;
    rate_limit_reset_at: string | null;
    created_at: string;
}

export default function FetchJobsSection() {
    const { __ } = useLang();
    const [jobs, setJobs] = useState<FetchJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [retryingJobIds, setRetryingJobIds] = useState<Set<number>>(
        new Set(),
    );
    const [logLines, setLogLines] = useState<string[]>([]);
    const [streamStatus, setStreamStatus] = useState<
        'connecting' | 'live' | 'error'
    >('connecting');
    const [logsExpanded, setLogsExpanded] = useState(false);
    const logsRef = useRef<HTMLPreElement | null>(null);

    const getRateLimitMessage = (resetAt: string) => {
        const resetTime = new Date(resetAt).getTime();
        if (Number.isNaN(resetTime)) {
            return __('Waiting for rate limit reset...');
        }

        const diffMs = resetTime - Date.now();
        const diffMinutes = Math.max(0, Math.ceil(diffMs / 60000));

        return __('Waiting for rate limit reset... ({minutes} min)', {
            minutes: diffMinutes,
        });
    };

    const handleRetry = (jobId: number) => {
        setRetryingJobIds((prev) => new Set(prev).add(jobId));
        router.post(
            `/tweets/fetch-jobs/${jobId}/retry`,
            {},
            {
                onFinish: () => {
                    setRetryingJobIds((prev) => {
                        const next = new Set(prev);
                        next.delete(jobId);
                        return next;
                    });
                },
            },
        );
    };

    // ポーリング（3秒ごと）
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await fetch('/tweets/fetch-jobs');
                const data = await response.json();
                setJobs(data.jobs);
            } catch (error) {
                console.error('Failed to fetch jobs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
        const interval = setInterval(fetchJobs, 3000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const maxLogLines = 150;
        const eventSource = new EventSource('/tweets/log-stream');

        const parseLines = (event: Event): string[] => {
            if (!(event instanceof MessageEvent)) {
                return [];
            }

            try {
                const payload = JSON.parse(event.data) as {
                    lines?: unknown;
                };

                if (!Array.isArray(payload.lines)) {
                    return [];
                }

                return payload.lines.filter(
                    (line): line is string =>
                        typeof line === 'string' && line.trim() !== '',
                );
            } catch {
                return [];
            }
        };

        const replaceLines = (lines: string[]) => {
            setLogLines(lines.slice(-maxLogLines));
        };

        const appendLines = (lines: string[]) => {
            if (lines.length === 0) {
                return;
            }

            setLogLines((prev) => [...prev, ...lines].slice(-maxLogLines));
        };

        const onSnapshot = (event: Event) => {
            replaceLines(parseLines(event));
        };
        const onReset = (event: Event) => {
            replaceLines(parseLines(event));
        };
        const onAppend = (event: Event) => {
            appendLines(parseLines(event));
        };

        eventSource.onopen = () => {
            setStreamStatus('live');
        };
        eventSource.onerror = () => {
            setStreamStatus('error');
        };
        eventSource.addEventListener('snapshot', onSnapshot);
        eventSource.addEventListener('reset', onReset);
        eventSource.addEventListener('append', onAppend);

        return () => {
            eventSource.close();
        };
    }, []);

    useEffect(() => {
        const element = logsRef.current;
        if (element === null) {
            return;
        }

        element.scrollTop = element.scrollHeight;
    }, [logLines]);

    // 処理中、待機中、失敗のジョブを表示
    const activeJobs = jobs.filter((job) =>
        ['pending', 'processing', 'failed'].includes(job.status),
    );

    if (loading) {
        return (
            <div className="rounded-xl border border-sidebar-border/70 bg-card p-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="mt-3 h-16 w-full" />
            </div>
        );
    }

    if (activeJobs.length === 0 && logLines.length === 0) {
        return null; // 非表示
    }

    return (
        <div className="rounded-xl border border-sidebar-border/70 bg-card p-4">
            <h2 className="mb-3 text-lg font-semibold">
                {__('Fetching Tweets')}
            </h2>
            {activeJobs.length > 0 && (
                <div className="space-y-2">
                    {activeJobs.map((job) => (
                        <div
                            key={job.id}
                            className="flex items-center justify-between rounded-lg border border-sidebar-border/50 p-3"
                        >
                            <div className="flex items-center gap-3">
                                {job.status === 'processing' ? (
                                    <Spinner className="size-5 text-blue-500" />
                                ) : job.status === 'failed' ? (
                                    <AlertCircle className="size-5 text-red-500" />
                                ) : (
                                    <Clock className="size-5 text-muted-foreground" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {__('Tweet ID')}: {job.tweet_id}
                                    </p>
                                    {job.status === 'failed' &&
                                        job.error_message && (
                                            <p className="text-sm text-red-600 dark:text-red-400">
                                                {job.error_message}
                                            </p>
                                        )}
                                    {job.rate_limit_reset_at &&
                                        job.status !== 'failed' && (
                                            <p className="text-sm text-muted-foreground">
                                                {getRateLimitMessage(
                                                    job.rate_limit_reset_at,
                                                )}
                                            </p>
                                        )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={
                                        job.status === 'processing'
                                            ? 'default'
                                            : job.status === 'failed'
                                              ? 'destructive'
                                              : 'secondary'
                                    }
                                >
                                    {job.status === 'processing'
                                        ? __('Processing')
                                        : job.status === 'failed'
                                          ? __('Failed')
                                          : __('Pending')}
                                </Badge>
                                {job.status === 'failed' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRetry(job.id)}
                                        disabled={retryingJobIds.has(job.id)}
                                    >
                                        {retryingJobIds.has(job.id) ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="size-4" />
                                        )}
                                        <span className="ml-1.5">
                                            {__('Retry')}
                                        </span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-4 rounded-lg border border-sidebar-border/50 bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setLogsExpanded((prev) => !prev)}
                        aria-expanded={logsExpanded}
                    >
                        {logsExpanded ? (
                            <ChevronDown className="mr-1 size-4" />
                        ) : (
                            <ChevronRight className="mr-1 size-4" />
                        )}
                        <span className="text-sm font-medium">
                            {__('Queue Logs')}
                        </span>
                    </Button>
                    <Badge
                        variant={
                            streamStatus === 'live'
                                ? 'default'
                                : streamStatus === 'error'
                                  ? 'destructive'
                                  : 'secondary'
                        }
                    >
                        {streamStatus === 'live'
                            ? __('Live')
                            : streamStatus === 'error'
                              ? __('Disconnected')
                              : __('Connecting')}
                    </Badge>
                </div>
                {logsExpanded &&
                    (logLines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {__('No log lines yet')}
                        </p>
                    ) : (
                        <pre
                            ref={logsRef}
                            className="max-h-56 overflow-y-auto rounded-md bg-background/70 p-2 font-mono text-xs leading-5"
                        >
                            {logLines.join('\n')}
                        </pre>
                    ))}
            </div>
        </div>
    );
}
