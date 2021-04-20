import "../../test/test_helper";
import redirectionScript from "../redirection-page";

const origin = "https://shop0.com/?x=шеллы";
const redirectTo = "shop1.myshop0.io";
const apiKey = "fakekey";

describe("redirectionScript", () => {
  it("returns a script tag with formatted data", () => {
    const script = redirectionScript({ origin, redirectTo, apiKey });

    expect(script).toContain(
      'shopOrigin: "https://shop0.com/?x=%D1%88%D0%B5%D0%BB%D0%BB%D1%8B"'
    );
  });
});
