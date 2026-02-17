import { store } from '@/actions/App/Http/Controllers/TweetController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLang } from '@/hooks/useLang';
import { Form } from '@inertiajs/react';

interface AddTweetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AddTweetDialog({
    open,
    onOpenChange,
}: AddTweetDialogProps) {
    const { __ } = useLang();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{__('Add Tweet')}</DialogTitle>
                    <DialogDescription>
                        {__('Enter tweet ID or URL to save')}
                    </DialogDescription>
                </DialogHeader>

                <Form action={store()} onSuccess={() => onOpenChange(false)}>
                    {({ errors, processing }) => (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="tweet_input">
                                    {__('Tweet ID or URL')}
                                </Label>
                                <Input
                                    id="tweet_input"
                                    name="tweet_input"
                                    type="text"
                                    placeholder="1234567890... または https://x.com/..."
                                    autoFocus
                                />
                                {errors.tweet_input && (
                                    <p className="text-sm text-destructive">
                                        {errors.tweet_input}
                                    </p>
                                )}
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={processing}
                                    >
                                        {__('Cancel')}
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing ? __('Saving...') : __('Save')}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
