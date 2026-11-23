import type { ComponentProps } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";

type TextLinkProps = Omit<
  ComponentProps<"a">,
  "children" | "href" | "target"
> & {
  /** 表示する文言。 */
  children: string;
  /** 移動先のURL。 */
  href: string;
  /** 開き方。省略時は同じタブ、`_blank`は新規タブ。 */
  target?: "_self" | "_blank";
};

/** テキストリンク。新規タブの場合は、記号と読み上げ用の説明を付ける。 */
function TextLink({
  children,
  target,
  rel,
  className,
  "aria-label": ariaLabel,
  ...props
}: TextLinkProps) {
  const newTab = target === "_blank";
  const characters = Array.from(children);
  const resolvedRel = newTab
    ? Array.from(
        new Set([
          ...(rel?.split(/\s+/).filter(Boolean) ?? []),
          "noopener",
          "noreferrer",
        ]),
      ).join(" ")
    : rel;
  return (
    <a
      {...props}
      target={target}
      rel={resolvedRel}
      aria-label={
        newTab && ariaLabel ? `${ariaLabel}（新しいタブで開きます）` : ariaLabel
      }
      className={cn(
        "text-link visited:text-link-visited [overflow-wrap:anywhere] underline decoration-1 underline-offset-3",
        "hover:decoration-2 hover:brightness-92 active:brightness-85",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
    >
      {newTab ? (
        <>
          {characters.slice(0, -1).join("")}
          <span className="whitespace-nowrap">
            {characters.at(-1)}
            <ExternalLink
              aria-hidden="true"
              size={12}
              className="mr-1 ml-0.5 inline-block size-3 align-[-0.1em]"
            />
          </span>
          <span className="sr-only">（新しいタブで開きます）</span>
        </>
      ) : (
        children
      )}
    </a>
  );
}

export { TextLink };
