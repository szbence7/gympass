import { PKPass } from 'passkit-generator';
import path from 'path';
import fs from 'fs';
import { env } from '../utils/env';
import { UserPass, PassType, PassToken } from '../db/schema';

export interface WalletPassData {
  pass: UserPass;
  passType: PassType;
  token: PassToken;
  userName: string;
}

export async function generateWalletPass(data: WalletPassData): Promise<Buffer> {
  const { pass, passType, token, userName } = data;

  if (env.WALLET_DEV_UNSIGNED) {
    return generateUnsignedPass(data);
  }

  const assetsPath = path.resolve(__dirname, '../../assets/wallet');

  const certificates = {
    wwdr: fs.readFileSync(env.WALLET_WWDR_CERT_PATH),
    signerCert: fs.readFileSync(env.WALLET_CERT_P12_PATH),
    signerKey: {
      keyFile: fs.readFileSync(env.WALLET_CERT_P12_PATH),
      passphrase: env.WALLET_CERT_P12_PASSWORD,
    },
  };

  const pkPass = await PKPass.from({
    model: assetsPath,
    certificates: certificates as any,
  }, {
    serialNumber: pass.walletSerialNumber,
    description: `${passType.name} - Gym Pass`,
    organizationName: env.WALLET_ORG_NAME,
    passTypeIdentifier: env.WALLET_PASS_TYPE_ID,
    teamIdentifier: env.WALLET_TEAM_ID,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(0, 122, 255)',
    labelColor: 'rgb(255, 255, 255)',
    logoText: env.WALLET_ORG_NAME,
  });

  const qrContent = `gympass://scan?token=${token.token}`;

  pkPass.setBarcodes({
    message: qrContent,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
  });

  pkPass.setRelevantDate(pass.validUntil || pass.validFrom);

  pkPass.headerFields.push({
    key: 'pass-type',
    label: 'Pass Type',
    value: passType.name,
  });

  if (pass.validUntil) {
    pkPass.primaryFields.push({
      key: 'expiry',
      label: 'Valid Until',
      value: pass.validUntil.toISOString().split('T')[0],
      dateStyle: 'PKDateStyleShort',
    });
  }

  if (pass.remainingEntries !== null) {
    pkPass.primaryFields.push({
      key: 'remaining',
      label: 'Remaining Entries',
      value: pass.remainingEntries.toString(),
    });
  }

  pkPass.secondaryFields.push({
    key: 'member',
    label: 'Member',
    value: userName,
  });

  pkPass.auxiliaryFields.push({
    key: 'serial',
    label: 'Serial Number',
    value: pass.walletSerialNumber,
  });

  const buffer = pkPass.getAsBuffer();
  return buffer;
}

function generateUnsignedPass(data: WalletPassData): Buffer {
  const { pass, passType, token, userName } = data;

  const qrContent = `gympass://scan?token=${token.token}`;

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: env.WALLET_PASS_TYPE_ID,
    serialNumber: pass.walletSerialNumber,
    teamIdentifier: env.WALLET_TEAM_ID,
    organizationName: env.WALLET_ORG_NAME,
    description: `${passType.name} - Gym Pass`,
    logoText: env.WALLET_ORG_NAME,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(0, 122, 255)',
    labelColor: 'rgb(255, 255, 255)',
    barcodes: [
      {
        message: qrContent,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
      },
    ],
    relevantDate: pass.validUntil ? pass.validUntil.toISOString() : pass.validFrom.toISOString(),
    generic: {
      headerFields: [
        {
          key: 'pass-type',
          label: 'Pass Type',
          value: passType.name,
        },
      ],
      primaryFields: [],
      secondaryFields: [
        {
          key: 'member',
          label: 'Member',
          value: userName,
        },
      ],
      auxiliaryFields: [
        {
          key: 'serial',
          label: 'Serial Number',
          value: pass.walletSerialNumber,
        },
      ],
    },
  };

  if (pass.validUntil) {
    (passJson.generic.primaryFields as any[]).push({
      key: 'expiry',
      label: 'Valid Until',
      value: pass.validUntil.toISOString().split('T')[0],
      dateStyle: 'PKDateStyleShort',
    });
  }

  if (pass.remainingEntries !== null) {
    (passJson.generic.primaryFields as any[]).push({
      key: 'remaining',
      label: 'Remaining Entries',
      value: pass.remainingEntries.toString(),
    });
  }

  const passBuffer = Buffer.from(JSON.stringify(passJson, null, 2));
  return passBuffer;
}
