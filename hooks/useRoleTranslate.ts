import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

export const useRoleTranslate = () => {
    const { t } = useTranslation();
    const { language } = useLanguage();

    // Helper to get role-specific keys if needed, 
    // or just return standard translation function
    return { t, language };
};
