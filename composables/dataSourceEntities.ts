import type { FieldDef, SourceItem } from './useDataSourceCanvas';

function field(name: string, type: FieldDef['type']): FieldDef {
  return { name, type };
}

function entity(key: string, label: string, description: string, fields: FieldDef[]): SourceItem {
  return { key, label, description, fields };
}

/** Managed retail model — also the source for demo presets. */
export const MANAGED_ENTITIES: SourceItem[] = [
  entity('orders', 'Orders', 'Customer orders (fact)', [
    field('id', 'Number'),
    field('customer_id', 'Number'),
    field('store_id', 'Number'),
    field('status', 'Attribute'),
    field('total_amount', 'Number'),
    field('order_date', 'Time'),
  ]),
  entity('order_items', 'Order Items', 'Line items per order', [
    field('id', 'Number'),
    field('order_id', 'Number'),
    field('product_id', 'Number'),
    field('quantity', 'Number'),
    field('unit_price', 'Number'),
    field('discount', 'Number'),
  ]),
  entity('customers', 'Customers', 'Customer master records', [
    field('id', 'Number'),
    field('name', 'Attribute'),
    field('email', 'Attribute'),
    field('segment', 'Attribute'),
    field('region_id', 'Number'),
    field('created_at', 'Time'),
  ]),
  entity('products', 'Products', 'Product catalog', [
    field('id', 'Number'),
    field('name', 'Attribute'),
    field('category_id', 'Number'),
    field('supplier_id', 'Number'),
    field('brand', 'Attribute'),
    field('unit_price', 'Number'),
  ]),
  entity('categories', 'Categories', 'Product categories', [
    field('id', 'Number'),
    field('name', 'Attribute'),
    field('department', 'Attribute'),
  ]),
  entity('suppliers', 'Suppliers', 'Product suppliers', [
    field('id', 'Number'),
    field('name', 'Attribute'),
    field('region_id', 'Number'),
    field('country', 'Attribute'),
  ]),
  entity('stores', 'Stores', 'Physical / online stores', [
    field('id', 'Number'),
    field('name', 'Attribute'),
    field('region_id', 'Number'),
    field('opened_at', 'Time'),
  ]),
  entity('regions', 'Regions', 'Sales regions', [
    field('id', 'Number'),
    field('name', 'Attribute'),
    field('country', 'Attribute'),
  ]),
  entity('employees', 'Employees', 'Store staff', [
    field('id', 'Number'),
    field('name', 'Attribute'),
    field('store_id', 'Number'),
    field('role', 'Attribute'),
    field('hire_date', 'Time'),
  ]),
];

/**
 * Unique tables per connection so catalog ids and labels never collide.
 * Keys are globally unique; demos keep using the Managed keys above.
 */
export const CONNECTION_DATASETS: Record<string, SourceItem[]> = {
  managed: MANAGED_ENTITIES,

  redshift: [
    entity('dw_sales', 'DW Sales', 'Warehouse sales fact', [
      field('id', 'Number'),
      field('customer_key', 'Number'),
      field('product_key', 'Number'),
      field('date_key', 'Number'),
      field('amount', 'Number'),
      field('quantity', 'Number'),
    ]),
    entity('dw_customers', 'DW Customers', 'Customer dimension', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('segment', 'Attribute'),
      field('region', 'Attribute'),
    ]),
    entity('dw_products', 'DW Products', 'Product dimension', [
      field('id', 'Number'),
      field('sku', 'Attribute'),
      field('category', 'Attribute'),
      field('brand', 'Attribute'),
    ]),
    entity('dw_dates', 'DW Dates', 'Date dimension', [
      field('id', 'Number'),
      field('calendar_date', 'Time'),
      field('fiscal_year', 'Number'),
      field('quarter', 'Attribute'),
    ]),
  ],

  'snowflake-logi': [
    entity('logi_reports', 'Logi Reports', 'Published Logi reports', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('owner_id', 'Number'),
      field('folder_id', 'Number'),
      field('updated_at', 'Time'),
    ]),
    entity('logi_folders', 'Logi Folders', 'Report folders', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('parent_id', 'Number'),
    ]),
    entity('logi_owners', 'Logi Owners', 'Report authors', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('email', 'Attribute'),
      field('role', 'Attribute'),
    ]),
    entity('logi_schedules', 'Logi Schedules', 'Refresh schedules', [
      field('id', 'Number'),
      field('report_id', 'Number'),
      field('cron', 'Attribute'),
      field('last_run', 'Time'),
    ]),
  ],

  'snowflake-peter': [
    entity('peter_accounts', 'Peter Accounts', 'Sandbox accounts', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('industry', 'Attribute'),
      field('owner', 'Attribute'),
    ]),
    entity('peter_opportunities', 'Peter Opportunities', 'Sandbox pipeline', [
      field('id', 'Number'),
      field('account_id', 'Number'),
      field('stage', 'Attribute'),
      field('amount', 'Number'),
      field('close_date', 'Time'),
    ]),
    entity('peter_activities', 'Peter Activities', 'Sandbox activity log', [
      field('id', 'Number'),
      field('account_id', 'Number'),
      field('type', 'Attribute'),
      field('occurred_at', 'Time'),
    ]),
  ],

  fivision: [
    entity('fv_invoices', 'AP Invoices', 'Accounts payable invoices', [
      field('id', 'Number'),
      field('vendor_id', 'Number'),
      field('amount', 'Number'),
      field('status', 'Attribute'),
      field('invoice_date', 'Time'),
    ]),
    entity('fv_invoice_lines', 'AP Invoice Lines', 'Invoice distributions', [
      field('id', 'Number'),
      field('invoice_id', 'Number'),
      field('gl_account_id', 'Number'),
      field('amount', 'Number'),
    ]),
    entity('fv_vendors', 'Vendors', 'Payee master', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('category', 'Attribute'),
      field('region', 'Attribute'),
    ]),
    entity('fv_gl_accounts', 'GL Accounts', 'Chart of accounts', [
      field('id', 'Number'),
      field('code', 'Attribute'),
      field('name', 'Attribute'),
      field('type', 'Attribute'),
    ]),
  ],

  postgresql: [
    entity('tickets', 'Tickets', 'Support tickets', [
      field('id', 'Number'),
      field('requester_id', 'Number'),
      field('queue_id', 'Number'),
      field('status', 'Attribute'),
      field('priority', 'Attribute'),
      field('opened_at', 'Time'),
    ]),
    entity('ticket_comments', 'Ticket Comments', 'Ticket thread', [
      field('id', 'Number'),
      field('ticket_id', 'Number'),
      field('author', 'Attribute'),
      field('body', 'Attribute'),
      field('created_at', 'Time'),
    ]),
    entity('requesters', 'Requesters', 'People who opened tickets', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('email', 'Attribute'),
      field('company', 'Attribute'),
    ]),
    entity('queues', 'Queues', 'Support queues', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('sla_hours', 'Number'),
    ]),
  ],

  parsable: [
    entity('work_orders', 'Work Orders', 'Connected-worker jobs', [
      field('id', 'Number'),
      field('procedure_id', 'Number'),
      field('site_id', 'Number'),
      field('status', 'Attribute'),
      field('started_at', 'Time'),
    ]),
    entity('job_steps', 'Job Steps', 'Steps inside a work order', [
      field('id', 'Number'),
      field('work_order_id', 'Number'),
      field('step_name', 'Attribute'),
      field('completed', 'Attribute'),
    ]),
    entity('procedures', 'Procedures', 'Standard work templates', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('version', 'Attribute'),
      field('category', 'Attribute'),
    ]),
    entity('sites', 'Sites', 'Plant / field sites', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('region', 'Attribute'),
    ]),
  ],

  'managed-peter': [
    entity('mp_customers', 'Peter Customers', 'Peter cohort customers', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('email', 'Attribute'),
      field('cohort', 'Attribute'),
    ]),
    entity('mp_subscriptions', 'Peter Subscriptions', 'Recurring plans', [
      field('id', 'Number'),
      field('customer_id', 'Number'),
      field('plan', 'Attribute'),
      field('mrr', 'Number'),
      field('started_at', 'Time'),
    ]),
    entity('mp_invoices', 'Peter Invoices', 'Subscription invoices', [
      field('id', 'Number'),
      field('subscription_id', 'Number'),
      field('amount', 'Number'),
      field('billed_at', 'Time'),
    ]),
  ],

  impala: [
    entity('page_views', 'Page Views', 'Clickstream page hits', [
      field('id', 'Number'),
      field('session_id', 'Number'),
      field('url', 'Attribute'),
      field('referrer', 'Attribute'),
      field('viewed_at', 'Time'),
    ]),
    entity('web_sessions', 'Web Sessions', 'Visitor sessions', [
      field('id', 'Number'),
      field('visitor_id', 'Number'),
      field('started_at', 'Time'),
      field('device', 'Attribute'),
    ]),
    entity('visitors', 'Visitors', 'Anonymous visitors', [
      field('id', 'Number'),
      field('cookie', 'Attribute'),
      field('country', 'Attribute'),
    ]),
  ],

  bigquery: [
    entity('ga_events', 'GA Events', 'Digital analytics events', [
      field('id', 'Number'),
      field('user_id', 'Number'),
      field('event_name', 'Attribute'),
      field('event_time', 'Time'),
      field('value', 'Number'),
    ]),
    entity('ga_sessions', 'GA Sessions', 'Analytics sessions', [
      field('id', 'Number'),
      field('user_id', 'Number'),
      field('campaign_id', 'Number'),
      field('started_at', 'Time'),
    ]),
    entity('ga_users', 'GA Users', 'Analytics users', [
      field('id', 'Number'),
      field('first_seen', 'Time'),
      field('country', 'Attribute'),
      field('device', 'Attribute'),
    ]),
    entity('ga_campaigns', 'GA Campaigns', 'Acquisition campaigns', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('channel', 'Attribute'),
      field('start_date', 'Time'),
    ]),
  ],

  elasticsearch: [
    entity('log_events', 'Log Events', 'Indexed application logs', [
      field('id', 'Number'),
      field('index_id', 'Number'),
      field('severity', 'Attribute'),
      field('message', 'Attribute'),
      field('timestamp', 'Time'),
    ]),
    entity('es_indices', 'Indices', 'Elasticsearch indices', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('docs', 'Number'),
      field('size_mb', 'Number'),
    ]),
    entity('es_alerts', 'Alerts', 'Watch / alert hits', [
      field('id', 'Number'),
      field('index_id', 'Number'),
      field('rule', 'Attribute'),
      field('triggered_at', 'Time'),
    ]),
  ],

  'postgresql-ses': [
    entity('se_accounts', 'SE Accounts', 'Sales-engineering accounts', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('territory_id', 'Number'),
      field('arr', 'Number'),
    ]),
    entity('se_demos', 'SE Demos', 'Product demonstrations', [
      field('id', 'Number'),
      field('account_id', 'Number'),
      field('product', 'Attribute'),
      field('demo_date', 'Time'),
    ]),
    entity('se_territories', 'SE Territories', 'SE coverage areas', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('region', 'Attribute'),
    ]),
  ],

  kipu: [
    entity('patients', 'Patients', 'EHR patient master', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('mrn', 'Attribute'),
      field('facility_id', 'Number'),
      field('admitted_at', 'Time'),
    ]),
    entity('encounters', 'Encounters', 'Clinical encounters', [
      field('id', 'Number'),
      field('patient_id', 'Number'),
      field('type', 'Attribute'),
      field('clinician', 'Attribute'),
      field('started_at', 'Time'),
    ]),
    entity('medications', 'Medications', 'Prescribed medications', [
      field('id', 'Number'),
      field('patient_id', 'Number'),
      field('name', 'Attribute'),
      field('dosage', 'Attribute'),
    ]),
    entity('facilities', 'Facilities', 'Treatment facilities', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('city', 'Attribute'),
      field('beds', 'Number'),
    ]),
  ],

  'redshift-snapshot': [
    entity('snap_inventory', 'Snapshot Inventory', 'Inventory as of snapshot', [
      field('id', 'Number'),
      field('sku_id', 'Number'),
      field('warehouse_id', 'Number'),
      field('on_hand', 'Number'),
      field('snapshot_at', 'Time'),
    ]),
    entity('snap_skus', 'Snapshot SKUs', 'SKU dimension at snapshot', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('category', 'Attribute'),
      field('unit_cost', 'Number'),
    ]),
    entity('snap_warehouses', 'Snapshot Warehouses', 'Warehouse dimension', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('region', 'Attribute'),
    ]),
  ],

  'isw-snowflake': [
    entity('sfdc_accounts', 'SFDC Accounts', 'Salesforce accounts', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('type', 'Attribute'),
      field('owner', 'Attribute'),
    ]),
    entity('sfdc_contacts', 'SFDC Contacts', 'Salesforce contacts', [
      field('id', 'Number'),
      field('account_id', 'Number'),
      field('name', 'Attribute'),
      field('email', 'Attribute'),
    ]),
    entity('sfdc_opportunities', 'SFDC Opportunities', 'Salesforce opportunities', [
      field('id', 'Number'),
      field('account_id', 'Number'),
      field('name', 'Attribute'),
      field('amount', 'Number'),
      field('stage', 'Attribute'),
    ]),
    entity('sfdc_leads', 'SFDC Leads', 'Salesforce leads', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('source', 'Attribute'),
      field('status', 'Attribute'),
    ]),
  ],

  'python-nested': [
    entity('json_orders', 'Nested Orders', 'Orders from nested JSON', [
      field('id', 'Number'),
      field('payload_id', 'Number'),
      field('total', 'Number'),
      field('created_at', 'Time'),
    ]),
    entity('json_line_items', 'Nested Line Items', 'Flattened line items', [
      field('id', 'Number'),
      field('order_id', 'Number'),
      field('sku', 'Attribute'),
      field('qty', 'Number'),
    ]),
    entity('json_payloads', 'JSON Payloads', 'Source documents', [
      field('id', 'Number'),
      field('source', 'Attribute'),
      field('schema_version', 'Attribute'),
    ]),
  ],

  'flight-schedule': [
    entity('flights', 'Flights', 'Scheduled flight lessons', [
      field('id', 'Number'),
      field('aircraft_id', 'Number'),
      field('instructor_id', 'Number'),
      field('departure', 'Time'),
      field('arrival', 'Time'),
    ]),
    entity('aircraft', 'Aircraft', 'Fleet tail numbers', [
      field('id', 'Number'),
      field('tail_number', 'Attribute'),
      field('type', 'Attribute'),
      field('hours', 'Number'),
    ]),
    entity('instructors', 'Instructors', 'Flight instructors', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('certificate', 'Attribute'),
      field('airport_id', 'Number'),
    ]),
    entity('airports', 'Airports', 'Home airports', [
      field('id', 'Number'),
      field('icao', 'Attribute'),
      field('name', 'Attribute'),
      field('city', 'Attribute'),
    ]),
  ],

  'learning-management': [
    entity('courses', 'Courses', 'LMS course catalog', [
      field('id', 'Number'),
      field('title', 'Attribute'),
      field('category', 'Attribute'),
      field('hours', 'Number'),
    ]),
    entity('learners', 'Learners', 'Enrolled people', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('email', 'Attribute'),
      field('cohort', 'Attribute'),
    ]),
    entity('enrollments', 'Enrollments', 'Course enrollments', [
      field('id', 'Number'),
      field('course_id', 'Number'),
      field('learner_id', 'Number'),
      field('status', 'Attribute'),
      field('enrolled_at', 'Time'),
    ]),
    entity('completions', 'Completions', 'Course completions', [
      field('id', 'Number'),
      field('enrollment_id', 'Number'),
      field('score', 'Number'),
      field('completed_at', 'Time'),
    ]),
  ],

  python: [
    entity('experiments', 'Experiments', 'Model training runs', [
      field('id', 'Number'),
      field('model_id', 'Number'),
      field('metric', 'Number'),
      field('run_at', 'Time'),
    ]),
    entity('ml_models', 'ML Models', 'Registered models', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('framework', 'Attribute'),
      field('version', 'Attribute'),
    ]),
    entity('features', 'Features', 'Model feature store', [
      field('id', 'Number'),
      field('model_id', 'Number'),
      field('name', 'Attribute'),
      field('dtype', 'Attribute'),
    ]),
    entity('predictions', 'Predictions', 'Scoring output', [
      field('id', 'Number'),
      field('experiment_id', 'Number'),
      field('input_ref', 'Attribute'),
      field('score', 'Number'),
    ]),
  ],

  petertest: [
    entity('sample_alpha', 'Sample Alpha', 'Peter test table A', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('value', 'Number'),
      field('updated_at', 'Time'),
    ]),
    entity('sample_beta', 'Sample Beta', 'Peter test table B', [
      field('id', 'Number'),
      field('alpha_id', 'Number'),
      field('status', 'Attribute'),
      field('score', 'Number'),
    ]),
    entity('sample_gamma', 'Sample Gamma', 'Peter test table C', [
      field('id', 'Number'),
      field('beta_id', 'Number'),
      field('note', 'Attribute'),
    ]),
  ],

  adventureworks: [
    entity('sales_order_header', 'SalesOrderHeader', 'AdventureWorks orders', [
      field('id', 'Number'),
      field('customer_id', 'Number'),
      field('order_date', 'Time'),
      field('status', 'Attribute'),
      field('total', 'Number'),
    ]),
    entity('sales_order_detail', 'SalesOrderDetail', 'AdventureWorks lines', [
      field('id', 'Number'),
      field('sales_order_id', 'Number'),
      field('product_id', 'Number'),
      field('qty', 'Number'),
      field('unit_price', 'Number'),
    ]),
    entity('aw_customer', 'Customer', 'AdventureWorks customers', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('territory_id', 'Number'),
      field('account_number', 'Attribute'),
    ]),
    entity('aw_product', 'Product', 'AdventureWorks products', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('product_number', 'Attribute'),
      field('list_price', 'Number'),
    ]),
  ],

  adventureworkspgr: [
    entity('person', 'Person', 'AdventureWorks people', [
      field('id', 'Number'),
      field('first_name', 'Attribute'),
      field('last_name', 'Attribute'),
      field('email', 'Attribute'),
    ]),
    entity('address', 'Address', 'Person addresses', [
      field('id', 'Number'),
      field('person_id', 'Number'),
      field('city', 'Attribute'),
      field('postal_code', 'Attribute'),
    ]),
    entity('sales_territory', 'SalesTerritory', 'Sales territories', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('country', 'Attribute'),
    ]),
    entity('credit_card', 'CreditCard', 'Stored cards', [
      field('id', 'Number'),
      field('person_id', 'Number'),
      field('last4', 'Attribute'),
      field('exp', 'Attribute'),
    ]),
  ],

  'water-data': [
    entity('stations', 'Stations', 'Hydrology stations', [
      field('id', 'Number'),
      field('name', 'Attribute'),
      field('river', 'Attribute'),
      field('lat', 'Number'),
      field('lon', 'Number'),
    ]),
    entity('readings', 'Readings', 'Water level readings', [
      field('id', 'Number'),
      field('station_id', 'Number'),
      field('level', 'Number'),
      field('flow', 'Number'),
      field('reading_at', 'Time'),
    ]),
    entity('water_alerts', 'Water Alerts', 'Threshold alerts', [
      field('id', 'Number'),
      field('station_id', 'Number'),
      field('type', 'Attribute'),
      field('triggered_at', 'Time'),
    ]),
  ],
};

/** Managed retail catalog, kept as `ENTITIES` for demo presets and files. */
export const ENTITIES = MANAGED_ENTITIES;

export function entitiesForConnectionId(connectionId: string): SourceItem[] {
  return CONNECTION_DATASETS[connectionId] ?? [];
}

export function connectionEntityKeys(connectionId: string): string[] {
  return entitiesForConnectionId(connectionId).map((table) => table.key);
}

/** Look up an entity definition by its globally unique catalog key. */
export function entityByKey(key: string): SourceItem | undefined {
  for (const tables of Object.values(CONNECTION_DATASETS)) {
    const match = tables.find((table) => table.key === key);
    if (match) return match;
  }
  return undefined;
}

export function isManagedEntityKey(key: string): boolean {
  return MANAGED_ENTITIES.some((table) => table.key === key);
}
