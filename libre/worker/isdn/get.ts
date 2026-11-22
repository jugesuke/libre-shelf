import { IsdnRootSchema, type IsdnData } from "@libre-worker/isdn/validate";
import type {
  Result,
  StatusBadGateway,
  StatusBadRequest,
  StatusNotFound,
} from "@libre-worker/error/error";
import type { Item } from "@libre-shared/entity/items/item";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  attributeNamePrefix: "@_",
});

const fetchISDNData = async (
  isdn: string,
): Promise<Result<string, 200, StatusBadGateway | StatusNotFound>> => {
  const response = await fetch(`https://isdn.jp/xml/${isdn}`);
  if (!response.ok) {
    if (response.status === 404) {
      return {
        ok: false,
        statusCode: 404,
        errorResponse: {
          error: "ISDN not found",
          details: `ISDN ${isdn} is not registered.`,
        },
      };
    }

    return {
      ok: false,
      statusCode: 502,
      errorResponse: {
        error: "Failed to fetch ISDN data",
        details: `HTTP error! status: ${response.status}`,
      },
    };
  }
  const xmlData = await response.text();

  return {
    ok: true,
    statusCode: 200,
    result: xmlData,
  };
};

export const getISDNItem = async (
  isdn: string,
): Promise<
  Result<IsdnData, 200, StatusBadRequest | StatusBadGateway | StatusNotFound>
> => {
  // ISDNデータを取得する
  const xmlData = await fetchISDNData(isdn);
  if (!xmlData.ok) {
    return {
      ok: false,
      statusCode: xmlData.statusCode,
      errorResponse: xmlData.errorResponse,
    };
  }

  // jsonデータに変換
  const jsonData = parser.parse(xmlData.result);

  // 取得したデータをパース
  const parsed = IsdnRootSchema.safeParse(jsonData);
  if (!parsed.success) {
    return {
      ok: false,
      statusCode: 400,
      errorResponse: {
        error: "Invalid ISDN data format",
        details: parsed.error,
      },
    };
  }
  const isdnData: IsdnData = parsed.data;

  return {
    ok: true,
    statusCode: 200,
    result: isdnData,
  };
};

/** isdn.jp のデータから `Item` を作る。 */
export const toItem = (isdn: string, data: IsdnData): Item => {
  const item = data.isdn.item;
  return {
    item_id: isdn,
    product_name: item["product-name"],
    publisher_name: item["publisher-name"],
    class: item.class,
    type: item.type,
    genre_code: item["genre-code"],
    price: item.price,
    sample_image_url: item["sample-image-uri"],
  };
};

/**
 * isdn.jp から商品の情報を取得して `Item` で返す。
 * 登録がなければ 404、接続できない・404 以外のエラーは 502、形が違うときは 400。
 */
export const lookupISDNItem = async (
  isdn: string,
): Promise<
  Result<Item, 200, StatusBadRequest | StatusBadGateway | StatusNotFound>
> => {
  const xmlData = await fetchISDNData(isdn).catch(
    (e): Result<string, 200, StatusBadGateway> => ({
      ok: false,
      statusCode: 502,
      errorResponse: {
        error: "Failed to fetch ISDN data",
        details: e instanceof Error ? e.message : String(e),
      },
    }),
  );
  if (!xmlData.ok) {
    return xmlData;
  }

  const parsed = IsdnRootSchema.safeParse(parser.parse(xmlData.result));
  if (!parsed.success) {
    return {
      ok: false,
      statusCode: 400,
      errorResponse: {
        error: "Invalid ISDN data format",
        details: parsed.error,
      },
    };
  }

  return { ok: true, statusCode: 200, result: toItem(isdn, parsed.data) };
};
