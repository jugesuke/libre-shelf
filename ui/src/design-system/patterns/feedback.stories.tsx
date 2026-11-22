import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { Alert } from "../../components/alert";
import { Button } from "../../components/button";
import { Card } from "../../components/card";
import { Dialog } from "../../components/dialog";
import { Field } from "../../components/field";
import { FloatingAlert } from "../../components/floating-alert";
import { Input } from "../../components/input";
import { Page } from "../../components/page";
import { useToast } from "../../components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/table";

const meta: Meta = {
  title: "デザインパターン/フィードバック",
  tags: ["!autodocs"],
  // ダイアログが説明ページ全体を覆わないよう、説明ページでは story を iframe の中で描く
  parameters: { docs: { story: { inline: false, height: "560px" } } },
};
export default meta;
type Story = StoryObj;

/** 入力の検証のエラーは、入力欄の下に出す */
export const FieldErrors: Story = {
  name: "入力の検証のエラー",
  render: () => (
    <Card title="新規発注を登録" className="m-4 max-w-md">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Field label="注文数量" required error="注文数量を 1 以上で入力してください。">
            <Input defaultValue="0" />
          </Field>
          <Field label="総額" required error="総額を入力してください。">
            <Input defaultValue="" />
          </Field>
        </div>
        <Button variant="primary">登録</Button>
      </div>
    </Card>
  ),
};

function FailureDialog() {
  const [open, setOpen] = useState(true);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <div className="p-4">
        <Button onClick={() => setOpen(true)}>ダイアログを開く</Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="新規発注を登録"
        failure={failed ? "発注を登録できませんでした。通信状態を確認して、もう一度登録してください。" : undefined}
        onFailureClose={() => setFailed(false)}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>キャンセル</Button>
            <Button variant="primary" onClick={() => setFailed((v) => !v)}>
              登録
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="注文数量" required>
            <Input defaultValue="100" />
          </Field>
          <Field label="総額" required>
            <Input defaultValue="10000" />
          </Field>
        </div>
      </Dialog>
    </>
  );
}

/** ダイアログの処理の失敗は、下部のボタンのすぐ下に浮かせて出す。「登録」を押すと、失敗のアラートを出したり消したりする */
export const Failure: Story = {
  name: "処理の失敗",
  render: () => <FailureDialog />,
};

function SuccessPage() {
  const { showToast } = useToast();
  return (
    <Page title="発注管理" actions={<Button onClick={() => showToast("発注を登録しました。")}>登録する</Button>}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>商品名</TableHead>
            <TableHead numeric>注文数量</TableHead>
            <TableHead numeric>総額</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>みほん同人誌</TableCell>
            <TableCell numeric>100</TableCell>
            <TableCell numeric>¥10,000</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Page>
  );
}

/** 成功は、画面の変化で分からないときだけ、画面の上部の中央にトーストで出す。「登録する」を押すと出る */
export const Success: Story = {
  name: "成功",
  render: () => <SuccessPage />,
};

const FAILURE = "商品を追加できませんでした。通信状態を確認して、もう一度追加してください。";

/** ボタンの左に空いた幅があるときは、そこにアラートをそのまま置く。ボタンの行は 2 行のアラートが入る高さを取っておく */
function FailureBesideDemo() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-4 p-4">
      <Card title="新規商品を追加" className="max-w-2xl">
        <div className="flex flex-col gap-4">
          <Field label="商品名" required>
            <Input defaultValue="みほん同人誌" />
          </Field>
          <div className="flex min-h-14 items-center justify-end gap-3">
            {failed && (
              <Alert variant="destructive" className="flex-1">
                {FAILURE}
              </Alert>
            )}
            <Button variant="primary" onClick={() => setFailed((v) => !v)}>
              追加
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** ボタンの左に置くとき。「追加」を押すと、失敗のアラートを出したり消したりする */
export const FailureBeside: Story = {
  name: "処理の失敗（ボタンの左に置く）",
  render: () => <FailureBesideDemo />,
};

/** ボタンの横に幅がないときは、行のすぐ下に浮かせて重ねる */
function FailureFloatingDemo() {
  const [failed, setFailed] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex flex-col gap-4 p-4">
      <Card title="ISDN から商品を追加" className="max-w-2xl">
        <div ref={row} className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="ISDN">
              <Input placeholder="ISDNコードを入力" />
            </Field>
          </div>
          <Button ref={button} variant="primary" onClick={() => setFailed((v) => !v)}>
            追加
          </Button>
        </div>
      </Card>
      <Card title="商品一覧" className="max-w-2xl">
        <p className="text-sm">カードの下の内容</p>
      </Card>
      <FloatingAlert anchor={row} target={button} message={FAILURE} open={failed} onClose={() => setFailed(false)} />
    </div>
  );
}

/** 浮かせて重ねるとき。「追加」を押すと、失敗のアラートを出したり消したりする。閉じるボタンと Esc キーでも消える */
export const FailureFloating: Story = {
  name: "処理の失敗（行の下に浮かせる）",
  render: () => <FailureFloatingDemo />,
};
