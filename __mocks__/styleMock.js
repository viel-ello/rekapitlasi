const styles = new Proxy({}, {
  get: (_target, key) => (typeof key === 'string' ? key : undefined),
});

module.exports = styles;
