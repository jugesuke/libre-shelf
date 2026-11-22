import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Field } from "./field";
import { Input } from "./input";

const cancelRef = React.createRef<HTMLButtonElement>();

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  // 説明ページは dialog.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  component: Dialog,
  // ダイアログが説明ページ全体を覆わないよう、説明ページでは story を iframe の中で描く
  parameters: { docs: { story: { inline: false, height: "520px" } } },
  // 説明ページでボタンを押さずに見えるよう、開いた状態で始める
  args: { open: true, onOpenChange: fn() },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md"] },
    initialFocus: {
      control: "inline-radio",
      options: ["content", "title", "cancel"],
      // 操作パネルでは ref を渡せないので、名前から ref に引き当てる
      mapping: { cancel: cancelRef },
      description: "開いたときの最初のフォーカス。`content`、`title`、または要素の ref。`cancel` は「キャンセル」の ref",
    },
    children: { control: false, description: "ダイアログの本文。要素を渡す。例: `<p>本文</p>`" },
    footer: { control: false, description: "下の操作の並び。ボタンなどを渡す。例: `<Button>キャンセル</Button>`" },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Dialog>;

/**
 * 開くボタンを置き、操作に合わせて `open` を書き換えて表示する。`footer` は閉じる関数を受け取って組み立てる。
 * Storybook の hook を使うので、返す関数を story の `render` に直接置く。
 */
const renderWithTrigger =
  (openLabel: string, footerOf: (close: () => void) => React.ReactNode): Story["render"] =>
  (args) => {
    const [, updateArgs] = useArgs();
    const setOpen = (open: boolean) => {
      args.onOpenChange(open);
      updateArgs({ open });
    };
    return (
      <>
        <Button onClick={() => setOpen(true)}>{openLabel}</Button>
        <Dialog
          {...args}
          onOpenChange={setOpen}
          onFailureClose={() => updateArgs({ failure: undefined })}
          footer={footerOf(() => setOpen(false))}
        />
      </>
    );
  };

export const Default: Story = {
  args: { title: "タイトル", children: <p className="text-sm">本文</p> },
  render: renderWithTrigger("ダイアログを開く", (close) => (
    <>
      <Button onClick={close}>キャンセル</Button>
      <Button variant="primary" onClick={close}>OK</Button>
    </>
  )),
};

export const Confirm: Story = {
  args: {
    title: "商品を削除しますか",
    size: "sm",
    children: <p className="text-sm">削除すると元に戻せません。</p>,
  },
  render: renderWithTrigger("削除を確認する", (close) => (
    <>
      <Button onClick={close}>キャンセル</Button>
      <Button variant="destructive">削除する</Button>
    </>
  )),
};

export const LongForm: Story = {
  args: {
    title: "商品を登録",
    size: "md",
    children: (
      <div className="flex flex-col gap-4">
        {["商品名", "価格", "在庫数", "ジャンル", "メモ"].map((label) => (
          <Field key={label} label={label}>
            <Input />
          </Field>
        ))}
      </div>
    ),
  },
  render: renderWithTrigger("商品を登録する", (close) => (
    <>
      <Button onClick={close}>キャンセル</Button>
      <Button variant="primary">登録</Button>
    </>
  )),
};

export const SingleButton: Story = {
  args: { title: "登録しました", children: <p className="text-sm">商品を登録しました。</p> },
  render: renderWithTrigger("お知らせを開く", (close) => (
    <Button variant="primary" onClick={close}>
      閉じる
    </Button>
  )),
};

/** 開いたときの最初のフォーカスを、操作パネルの `initialFocus` で試す */
export const InitialFocus: Story = {
  args: {
    title: "商品を登録",
    initialFocus: "content",
    children: (
      <Field label="商品名">
        <Input />
      </Field>
    ),
  },
  render: renderWithTrigger("フォーカスを試す", (close) => (
    <>
      <Button ref={cancelRef} onClick={close}>キャンセル</Button>
      <Button variant="primary" onClick={close}>登録</Button>
    </>
  )),
};

/** 処理の失敗を `failure` で出す。下部のボタンの行の下に浮かせて重ね、枠の外へはみ出させる */
export const WithFailure: Story = {
  args: {
    title: "ロケーションを追加",
    failure: "ロケーションを追加できませんでした。通信状態を確認して、もう一度追加してください。",
    children: (
      <Field label="名前">
        <Input defaultValue="自宅" />
      </Field>
    ),
  },
  render: renderWithTrigger("ロケーションを追加する", (close) => (
    <>
      <Button onClick={close}>キャンセル</Button>
      <Button variant="primary">追加</Button>
    </>
  )),
};

/** 画面の縦に収まらない本文。スクロールするのは本文だけで、見出しと下部のボタンは動かない */
export const ScrollingBody: Story = {
  args: {
    title: "商品を登録",
    children: (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 12 }, (_, i) => `項目 ${i + 1}`).map((label) => (
          <Field key={label} label={label}>
            <Input />
          </Field>
        ))}
      </div>
    ),
  },
  render: renderWithTrigger("商品を登録する", (close) => (
    <>
      <Button onClick={close}>キャンセル</Button>
      <Button variant="primary">登録</Button>
    </>
  )),
};
