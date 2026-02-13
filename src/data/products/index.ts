export type { Product } from "./types";
import { outerwear } from "./outerwear";
import { dresses } from "./dresses";
import { shoes } from "./shoes";
import { accessories } from "./accessories";
import { suits } from "./suits";
import { knitwear } from "./knitwear";
import { bags } from "./bags";
import { trousers } from "./trousers";
import { watches } from "./watches";
import { shirts } from "./shirts";
import { blazers } from "./blazers";

export const products = [
  ...outerwear,
  ...dresses,
  ...shoes,
  ...accessories,
  ...suits,
  ...knitwear,
  ...bags,
  ...trousers,
  ...watches,
  ...shirts,
  ...blazers,
];

export const categories = [...new Set(products.map(p => p.category))];
