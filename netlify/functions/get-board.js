import { getStore } from "@netlify/blobs";

const INITIAL_PRICES = [2500, 1800, 1200, 850, 600, 450, 350, 250, 197, 147];
const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000; // Brasil é UTC-3 (sem horário de verão desde 2019)
const LAUNCH_DISCOUNT = 0.10; // paga 10% do valor cheio = 90% off
const LAUNCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias de desconto de lançamento

function isLaunchActive(launchDate, now) {
  return now.getTime() - new Date(launchDate).getTime() < LAUNCH_WINDOW_MS;
}

function defaultBoard(launchDate, now) {
  const discountActive = isLaunchActive(launchDate, now);
  return INITIAL_PRICES.map((basePrice) => ({
    name: null,
    desc: null,
    holder: false,
    basePrice,
    price: discountActive ? Math.round(basePrice * LAUNCH_DISCOUNT) : basePrice,
    discountActive,
  }));
}

// Calcula o próximo domingo às 23:59 (horário de Brasília), retornado como instante UTC real
function nextSundayReset(fromUtc) {
  const brWallClock = new Date(fromUtc.getTime() - BRAZIL_OFFSET_MS);
  const dayOfWeek = brWallClock.getUTCDay(); // 0 = domingo
  let daysUntilSunday = (7 - dayOfWeek) % 7;

  let target = new Date(
    Date.UTC(
      brWallClock.getUTCFullYear(),
      brWallClock.getUTCMonth(),
      brWallClock.getUTCDate() + daysUntilSunday,
      23,
      59,
      0
    )
  );

  if (target.getTime() <= brWallClock.getTime()) {
    target = new Date(target.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  return new Date(target.getTime() + BRAZIL_OFFSET_MS);
}

export default async () => {
  const store = getStore("podio-board");
  let data = await store.get("state", { type: "json" });
  const now = new Date();

  if (!data) {
    const launchDate = now.toISOString();
    data = {
      launchDate,
      entries: defaultBoard(launchDate, now),
      nextReset: nextSundayReset(now).toISOString(),
    };
    await store.setJSON("state", data);
  } else if (now >= new Date(data.nextReset)) {
    data = {
      launchDate: data.launchDate,
      entries: defaultBoard(data.launchDate, now),
      nextReset: nextSundayReset(now).toISOString(),
    };
    await store.setJSON("state", data);
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/.netlify/functions/get-board",
};
