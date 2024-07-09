import { clusterApiUrl, Connection } from '@solana/web3.js';

export const connection = new Connection(process.env.SOLANA_MAINNET_RPC);
