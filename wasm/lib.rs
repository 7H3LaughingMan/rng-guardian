use base64::prelude::*;
use rand::{RngExt, SeedableRng};
use rand_pcg::Pcg64Mcg;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PcgRandom(Pcg64Mcg);

#[wasm_bindgen]
impl PcgRandom {
    #[wasm_bindgen(constructor)]
    pub fn new(state: Option<String>) -> PcgRandom {
        match state {
            Some(state) => match BASE64_STANDARD.decode(state) {
                Ok(state) => match state.try_into() {
                    Ok(state) => PcgRandom(Pcg64Mcg::from_seed(state)),
                    Err(_) => PcgRandom(rand::make_rng()),
                },
                Err(_) => PcgRandom(rand::make_rng()),
            },
            None => PcgRandom(rand::make_rng()),
        }
    }

    #[wasm_bindgen]
    pub fn random(&mut self) -> f64 {
        self.0.random()
    }

    #[wasm_bindgen]
    pub fn state(&self) -> String {
        BASE64_STANDARD.encode(self.0.state().to_le_bytes())
    }
}
