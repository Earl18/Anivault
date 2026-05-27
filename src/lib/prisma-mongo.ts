export function isPrismaMongoReplicaSetError(error: unknown) {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'P2031'
  );
}

export function getPrismaMongoReplicaSetHelp() {
  return [
    'Prisma MongoDB writes require MongoDB to run as a replica set.',
    'Your current local MongoDB service is running in standalone mode.',
    'Update mongod.cfg to include:',
    'replication:',
    '  replSetName: rs0',
    'Then restart the MongoDB service, run rs.initiate(), and update DATABASE_URL to include replicaSet=rs0.',
  ].join(' ');
}
