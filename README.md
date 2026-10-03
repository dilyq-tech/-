# Тихая вода

Адаптивный React-сайт с живой аквариумной симуляцией на Canvas. Экосистема хранится в `localStorage` и рассчитывает изменения за время между посещениями.

## Запуск локально

1. Установите Node.js 20.19+ или 22.12+.
2. Установите зависимости из корневой папки проекта:

   ```bash
   corepack pnpm install
   ```

   Если у вас установлен npm, можно выполнить `npm install`.

3. Запустите сервер разработки:

   ```bash
   corepack pnpm dev
   ```

   Или используйте `npm run dev`.

   Для доступа с других устройств в локальной сети запустите `corepack pnpm start`.

4. Откройте URL, который выведет Vite, обычно `http://localhost:5173`.

## Production-сборка

```bash
corepack pnpm build
corepack pnpm preview
```

## Постоянный локальный URL (Linux с systemd)

Пользовательский systemd-сервис `tidepool.service` раздаёт готовую production-сборку, запускается автоматически при входе в систему и перезапускается при сбое. После изменения исходников пересоберите приложение, чтобы обновить сайт:

```bash
corepack pnpm build
systemctl --user restart tidepool.service
```

```bash
systemctl --user status tidepool.service
systemctl --user restart tidepool.service
systemctl --user stop tidepool.service
journalctl --user -u tidepool.service -f
```

Чтобы открыть сайт с другого устройства в той же сети, используйте текущий LAN-адрес компьютера с портом `5173`.

## Структура

- `src/components/Aquarium.jsx` — Canvas и анимация обитателей.
- `src/components/DashboardPanels.jsx` — карточки показателей, управление условиями, история и список существ.
- `src/components/Navigation.jsx` — боковая и мобильная навигация.
- `src/components/Atmosphere.jsx` — указатель, реактивный фон и уведомления.
- `src/hooks/useScrollReveal.js` — появление блоков при прокрутке.
- `src/simulation.js` — симуляция, наследование генов и хранение мира.
