<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TopicController extends Controller
{
    /**
     * Display a listing of all topics with document counts.
     */
    public function index(Request $request): Response
    {
        $topics = Topic::query()
            ->withCount('markdownDocuments')
            ->orderByDesc('markdown_documents_count')
            ->orderBy('name')
            ->get()
            ->map(fn (Topic $topic) => [
                'id' => $topic->id,
                'name' => $topic->name,
                'slug' => $topic->slug,
                'documents_count' => $topic->markdown_documents_count,
                'created_at' => $topic->created_at?->toISOString(),
                'updated_at' => $topic->updated_at?->toISOString(),
            ]);

        return Inertia::render('topics/index', [
            'topics' => $topics,
        ]);
    }

    /**
     * Display documents for a specific topic with access control.
     */
    public function show(Request $request, string $slug): Response
    {
        $topic = Topic::query()
            ->where('slug', $slug)
            ->firstOrFail();

        $userId = $request->user()->id;

        // Get documents with access control
        $documents = $topic->markdownDocuments()
            ->where(function ($query) use ($userId) {
                // Published documents are visible to all authenticated users
                $query->where('status', 'published')
                    // Draft/private documents are only visible to their creator
                    ->orWhere(function ($q) use ($userId) {
                        $q->whereIn('status', ['draft', 'private'])
                            ->where(function ($q2) use ($userId) {
                                $q2->where('created_by', $userId)
                                    ->orWhere('updated_by', $userId);
                            });
                    });
            })
            ->with(['createdBy', 'updatedBy'])
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->through(fn ($document) => [
                'id' => $document->id,
                'slug' => $document->slug,
                'title' => $document->title,
                'status' => $document->status,
                'created_at' => $document->created_at?->toISOString(),
                'updated_at' => $document->updated_at?->toISOString(),
                'created_by' => $document->createdBy ? [
                    'id' => $document->createdBy->id,
                    'name' => $document->createdBy->name,
                ] : null,
                'updated_by' => $document->updatedBy ? [
                    'id' => $document->updatedBy->id,
                    'name' => $document->updatedBy->name,
                ] : null,
            ]);

        return Inertia::render('topics/show', [
            'topic' => [
                'id' => $topic->id,
                'name' => $topic->name,
                'slug' => $topic->slug,
                'created_at' => $topic->created_at?->toISOString(),
            ],
            'documents' => $documents,
        ]);
    }
}
