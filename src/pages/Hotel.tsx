import FacilityExpenses from '@/components/app/FacilityExpenses';
import { FACILITIES } from '@/lib/houseCategories';

const Hotel = () => <FacilityExpenses facility={FACILITIES.hotel} />;

export default Hotel;
