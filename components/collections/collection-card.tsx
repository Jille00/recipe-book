"use client";

import Image from "next/image";
import Link from "next/link";
import { FolderOpen, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { formatRecipeCount } from "@/lib/collections";

export interface CollectionCardData {
  id: string;
  name: string;
  recipeCount: number;
  coverImageUrl: string | null;
}

interface CollectionCardProps {
  collection: CollectionCardData;
  onRename: () => void;
  onDelete: () => void;
}

/**
 * A collection in the /collections grid. Built like RecipeCard (STYLE_GUIDE
 * 04/05): 4:3 cover, parchment card, soft shadow lifting on hover, and a
 * stretched title link so the whole card opens the collection while the menu
 * button stays a separate control.
 */
export function CollectionCard({ collection, onRename, onDelete }: CollectionCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lifted">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {collection.coverImageUrl ? (
          <Image
            src={collection.coverImageUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          </div>
        )}

        {/* Not modal: the rename and delete dialogs it opens manage focus
            and pointer locking themselves. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="glass absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Options for ${collection.name}`}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onRename}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-4">
        <h2 className="font-display text-xl font-semibold text-foreground line-clamp-1 transition-colors group-hover:text-primary">
          <Link
            href={`/collections/${collection.id}`}
            className="after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-primary focus-visible:after:ring-offset-2"
          >
            {collection.name}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatRecipeCount(collection.recipeCount)}
        </p>
      </div>
    </article>
  );
}
