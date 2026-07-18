import express from 'express';
import { productsRouter } from './transmission/ProductsRouter';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Mount the export router
app.use('/api/v1', productsRouter);

app.listen(port, () => {
  console.log(`[Server] AdventureWorks to Zalando pipeline running on port ${port}`);
});
