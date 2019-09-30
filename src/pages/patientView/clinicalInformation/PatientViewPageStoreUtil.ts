import { IServerConfig } from "config/IAppConfig";
import { GeneFilterOption } from "../mutation/GeneFilterMenu";

export function getGeneFilterDefault(config:IServerConfig):GeneFilterOption {
    const propName = 'skin_patientview_filter_genes_profiled_all_samples';
    if (config && propName in config && config[propName]) {
        return GeneFilterOption.ALL_SAMPLES;
    }
    return GeneFilterOption.ANY_SAMPLE;
}