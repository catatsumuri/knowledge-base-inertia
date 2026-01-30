import PublicFeedbackController from '@/actions/App/Http/Controllers/PublicFeedbackController';
import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form } from '@inertiajs/react';
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface PublicFeedbackFormProps {
    pageSlug: string;
    pageUrl: string;
    honeypot?: {
        enabled: boolean;
        nameFieldName: string;
        validFromFieldName: string;
        encryptedValidFrom: string;
    };
    captcha?: {
        question: string;
    };
}

export default function PublicFeedbackForm({
    pageSlug,
    pageUrl,
    honeypot,
    captcha,
}: PublicFeedbackFormProps) {
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    return (
        <Card className="mt-8 gap-0 py-0">
            <Collapsible defaultOpen={false}>
                <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-6 py-4 transition-colors hover:bg-muted/40 data-[state=open]:bg-primary/5">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="size-5 text-muted-foreground" />
                            <CardTitle className="text-lg">
                                フィードバック
                            </CardTitle>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground data-[state=open]:hidden" />
                        <ChevronDown className="h-4 w-4 text-muted-foreground data-[state=closed]:hidden" />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-4 px-6 pb-6 pt-4">
                        <p className="text-sm text-muted-foreground">
                            このページに関するご意見・ご感想をお聞かせください。いただいたフィードバックは、今後の改善に役立てさせていただきます。
                        </p>

                        <Form
                            action={PublicFeedbackController.store()}
                            options={{
                                preserveScroll: true,
                            }}
                            onSuccess={() => {
                                setShowSuccessMessage(true);
                                setTimeout(
                                    () => setShowSuccessMessage(false),
                                    5000,
                                );
                            }}
                            resetOnSuccess
                            className="space-y-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    {showSuccessMessage && (
                                        <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-400/30 dark:bg-green-950/30 dark:text-green-100">
                                            <AlertDescription>
                                                フィードバックをお送りいただきありがとうございます！
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <input
                                        type="hidden"
                                        name="page_slug"
                                        value={pageSlug}
                                    />
                                    <input
                                        type="hidden"
                                        name="page_url"
                                        value={pageUrl}
                                    />
                                    {honeypot?.enabled && (
                                        <div
                                            style={{ display: 'none' }}
                                            name={`${honeypot.nameFieldName}_wrap`}
                                        >
                                            <input
                                                type="text"
                                                name={honeypot.nameFieldName}
                                                id={honeypot.nameFieldName}
                                                autoComplete="off"
                                                defaultValue=""
                                            />
                                            <input
                                                type="text"
                                                name={
                                                    honeypot.validFromFieldName
                                                }
                                                autoComplete="off"
                                                defaultValue={
                                                    honeypot.encryptedValidFrom
                                                }
                                            />
                                        </div>
                                    )}

                                    <div className="grid gap-2">
                                        <Label htmlFor="feedback_content">
                                            フィードバック内容
                                        </Label>
                                        <Textarea
                                            id="feedback_content"
                                            name="feedback_content"
                                            placeholder="ご意見・ご感想をお聞かせください..."
                                            rows={4}
                                            className="resize-none field-sizing-content"
                                            disabled={processing}
                                        />
                                        <InputError
                                            message={errors.feedback_content}
                                        />
                                    </div>

                                    {captcha && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="captcha_answer">
                                                スパム対策: {captcha.question}
                                            </Label>
                                            <input
                                                id="captcha_answer"
                                                name="captcha_answer"
                                                placeholder="答えを入力してください"
                                                className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={processing}
                                            />
                                            <InputError
                                                message={errors.captcha_answer}
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4">
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing ? '送信中...' : '送信'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
