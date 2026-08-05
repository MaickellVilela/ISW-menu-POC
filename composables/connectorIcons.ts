import bigqueryIcon from '~/assets/images/connections/bigquery.png';
import elasticsearchIcon from '~/assets/images/connections/elasticsearch.png';
import hiveIcon from '~/assets/images/connections/hive.png';
import impalaIcon from '~/assets/images/connections/impala.png';
import mongodbIcon from '~/assets/images/connections/mongodb.png';
import postgresqlIcon from '~/assets/images/connections/postgresql.png';
import pythonIcon from '~/assets/images/connections/python.png';
import redshiftIcon from '~/assets/images/connections/redshift.png';
import s3Icon from '~/assets/images/connections/s3.png';
import snowflakeIcon from '~/assets/images/connections/snowflake.svg';

/** Connector logos, keyed by vendor. */
export type ConnectorKey =
  | 'bigquery'
  | 'elasticsearch'
  | 'hive'
  | 'impala'
  | 'mongodb'
  | 'postgresql'
  | 'python'
  | 'redshift'
  | 's3'
  | 'snowflake';

export const CONNECTOR_ICONS: Record<ConnectorKey, string> = {
  bigquery: bigqueryIcon,
  elasticsearch: elasticsearchIcon,
  hive: hiveIcon,
  impala: impalaIcon,
  mongodb: mongodbIcon,
  postgresql: postgresqlIcon,
  python: pythonIcon,
  redshift: redshiftIcon,
  s3: s3Icon,
  snowflake: snowflakeIcon,
};

export function connectorIcon(key: ConnectorKey | null | undefined): string | null {
  return key ? CONNECTOR_ICONS[key] : null;
}

/** Engine labels as they appear on a connection, e.g. "PostgreSQL". */
const TYPE_TO_CONNECTOR: Record<string, ConnectorKey> = {
  bigquery: 'bigquery',
  elasticsearch: 'elasticsearch',
  hive: 'hive',
  impala: 'impala',
  mongodb: 'mongodb',
  postgresql: 'postgresql',
  python: 'python',
  redshift: 'redshift',
  s3: 's3',
  snowflake: 'snowflake',
};

export function connectorKeyForType(type: string): ConnectorKey | null {
  return TYPE_TO_CONNECTOR[type.trim().toLowerCase()] ?? null;
}
