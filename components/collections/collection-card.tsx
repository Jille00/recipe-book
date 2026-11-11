"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { ColourStripes } from "@/components/recipe/recipe-colour";
import type { RecipeColour } from "@/lib/recipe-colour";

export interface CollectionCardData {
  id: string;
  name: string;
  recipeCount: number;
  /** The colours of its newest recipes, one stripe each. */
  colours: readonly RecipeColour[];
}

interface CollectionCardProps {
  collection: CollectionCardData;
  onRename: () => void;
  onDelete: () => void;
}

/**
 * A collection in the /collections grid (STYLE_GUIDE 04): a cover striped in
 * the colours of its recipes, a white panel below, and a stretched title link
 * so the whole card opens the collection while the menu button stays a
 * separate control.
 */
export function CollectionCard({ collection, onRename, onDelete }: CollectionCardProps) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[20px] bg-card transition-[translate,box-shadow] duration-(--duration-slow) ease-out hover:-translate-y-1 hover:shadow-lifted">
      <div className="relative h-32 overflow-hidden">
        <ColourStripes colours={collection.colours} />

        {/* Not modal: the rename and delete dialogs it opens manage focus
            and pointer locking themselves. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      <div className="px-5 pt-4 pb-5">
        <h2 className="font-display text-4xl leading-[0.95] text-foreground line-clamp-2">
          <Link
            href={`/collections/${collection.id}`}
            className="after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[20px] focus-visible:after:ring-2 focus-visible:after:ring-primary focus-visible:after:ring-offset-2"
          >
            {collection.name}
          </Link>
        </h2>
        <p className="mt-1.5 text-[15px] font-semibold text-muted-foreground">
          <span className="tabular">{collection.recipeCount}</span>{" "}
          {collection.recipeCount === 1 ? "recipe" : "recipes"}
        </p>
      </div>
    </article>
  );
}
