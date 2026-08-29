import Icon from '@/components/ui/icon';
import { Row, updateRow, removeRow } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  tracks: Row[];
  mayEdit: boolean;
  load: () => void;
}

const TracksTable = ({ tracks, mayEdit, load }: Props) => (
  <>
    {tracks.length > 0 && (
      <div className="mt-8">
        <div className="h-label mb-3">Загруженные треки и границы</div>
        <div className="border border-[#e2e2df] overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="bg-[var(--hero-surface)]">
                <th className="h-label text-left px-4 py-2 font-normal">Название</th>
                <th className="h-label text-left px-4 py-2 font-normal w-[120px]">Тип</th>
                <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Цвет</th>
                <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Показать</th>
                <th className="h-label text-left px-4 py-2 font-normal w-[100px]" />
              </tr>
            </thead>
            <tbody>
              {tracks.map((t) => (
                <tr key={String(t.id)} className="border-t border-[#e2e2df]">
                  <td className="px-4 py-2 text-[0.72em]">{String(t.name)}</td>
                  <td className="px-4 py-2 text-[0.68em]">
                    {t.kind === 'track' ? 'Трек / граница' : 'Точки'}
                  </td>
                  <td className="px-4 py-2">
                    {mayEdit ? (
                      <input
                        type="color"
                        value={String(t.color || '#ff5a1f')}
                        className="w-10 h-6 border border-[#e2e2df] bg-white"
                        onChange={async (e) => {
                          await updateRow('map_layers', { id: t.id, color: e.target.value });
                          load();
                        }}
                      />
                    ) : (
                      <span
                        className="inline-block w-10 h-6 border border-[#e2e2df]"
                        style={{ background: String(t.color || '#ff5a1f') }}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-black"
                      checked={t.visible !== false}
                      onChange={async (e) => {
                        await updateRow('map_layers', { id: t.id, visible: e.target.checked });
                        load();
                      }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    {mayEdit && (
                      <button
                        className="h-label underline"
                        onClick={async () => {
                          await removeRow('map_layers', Number(t.id));
                          toast.success('Слой убран');
                          load();
                        }}
                      >
                        Убрать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    <div className="mt-8 border border-[#e2e2df] p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="Info" size={15} fallback="Circle" />
        <span className="h-label">Как загрузить свои данные</span>
      </div>
      <div className="h-mono-cap normal-case text-[var(--hero-muted)] leading-relaxed">
        Кнопка «Загрузить треки» принимает файлы GPX, KML и GeoJSON — это форматы, которые
        отдают все навигаторы и приложения вроде Locus Map, OsmAnd, Garmin. Границы хозяйства,
        маршруты и путевые точки лягут поверх спутника. Файлы SQLITEDB — это офлайн-кэш
        спутниковых тайлов, картинки без координат объектов; их место занимает встроенный
        спутниковый слой, а точки и треки экспортируйте из того же приложения в GPX или KML.
      </div>
    </div>
  </>
);

export default TracksTable;
