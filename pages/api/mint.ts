import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from '@solana/web3.js';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../../openapi';
import { prepareTransaction } from '../../shared/transaction-utils';
import { ActionGetResponse, ActionPostRequest, ActionPostResponse } from '@solana/actions';
import axios from 'axios';

const app = new OpenAPIHono();

app.openapi(
  createRoute({
    method: 'get',
    path: '/{siteId}',
    tags: ['Mint'],
    request: {
      params: z.object({
        siteId: z.string().openapi({
          param: {
            name: 'siteId',
            in: 'path',
          },
          type: 'number',
          example: '18',
        }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  (c) => {
    const siteId = c.req.param('siteId');
    const { icon, title, description } = getMintInfo();
    const response: ActionGetResponse = {
      icon,
      label: `Mint Now`,
      title,
      description,
    };
    return c.json(response, 200);
  },
);

app.openapi(
  createRoute({
    method: 'post',
    path: '/{siteId}',
    tags: ['Mint'],
    request: {
      params: z.object({
        siteId: z
          .string()
          .optional()
          .openapi({
            param: {
              name: 'siteId',
              in: 'path',
              required: false,
            },
            type: 'number',
            example: '18',
          }),
      }),
      body: actionSpecOpenApiPostRequestBody,
    },
    responses: actionsSpecOpenApiPostResponse,
  }),
  async (c) => {
    const siteId = c.req.param('site_id');
    const { account } = (await c.req.json()) as ActionPostRequest;

    const collectionData = axios.get('https://radius.art/wp-json/nftbuilder/v1/collection/' + siteId, {
      auth: { username: process.env.RADIUS_ART_USERNAME, password: process.env.RADIUS_ART_PASSWORD },
      headers: { 'Content-Type': 'application/json' }
    });

    const transaction = await prepareMintTransaction(
      new PublicKey(account),
      new PublicKey(process.env.MINT_PRICE_RECEIVER),
      collectionData.price * LAMPORTS_PER_SOL,
    );
    const response: ActionPostResponse = {
      transaction: Buffer.from(transaction.serialize()).toString('base64'),
    };

    axios.post('https://radius.art/wp-json/nftbuilder/v1/mint/' + siteId, { publicKey: account }, {
      auth: { username: process.env.RADIUS_ART_USERNAME, password: process.env.RADIUS_ART_PASSWORD },
      headers: { 'Content-Type': 'application/json' }
    });

    return c.json(response, 200);
  },
);

function getMintInfo(): Pick<
  ActionGetResponse,
  'icon' | 'title' | 'description'
> {

  const mintPageData = axios.get('https://radius.art/wp-json/nftbuilder/v1/mint-page/' + siteId, {
    auth: { username: process.env.RADIUS_ART_USERNAME, password: process.env.RADIUS_ART_PASSWORD },
    headers: { 'Content-Type': 'application/json' }
  });

  return { mintPageData.imageUrl, mintPageData.title, mintPageData.content };
}
async function prepareMintTransaction(
  sender: PublicKey,
  recipient: PublicKey,
  lamports: number,
): Promise<VersionedTransaction> {
  const payer = new PublicKey(sender);
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: new PublicKey(recipient),
      lamports: lamports,
    }),
  ];
  return prepareTransaction(instructions, payer);
}

export default app;
